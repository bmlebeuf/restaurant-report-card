// *********************************************
// **    Code Author: Bre and Allisa LeBeuf 
// **    Date: March 2018                        
// **    Description: Main JS file for health inspection app/final project JS-200
// **********************************************

$(document).ready(function() {

    // Handler for button clicks.
    $('.custom').click(function() {
        $(this).parent().find('button').each(function() {
            $(this).removeClass('active');
        });
        $(this).toggleClass("active");
    });

    // Search for locations.
    $('#search').click(function() {

        // Get distance option selected by user.
        var distance = $('#distance').find('.active').attr('data-distance');

        // Calculate bounding box.
        var options = getBoundingBox(coordinates, distance);

        // Get the number of results selected by the user.
        options.limit = $('#number').find('.active').attr('data-number');

        // Build query URL.
        var build_query = Handlebars.compile(query_template);
        var url = build_query(options);
        
        // function to add markers to map for each result in list
        var markers = [];
        function plotMap(x) {
            var pLabel = 'ABCDEFHIGKLMNOPQRDTUVWXYZ';
            var plabelIndex = 0;
            for (let i = 0; i < x.length; i++) {
                var pLatCoord = x[i].latitude;
                var pLngCoord = x[i].longitude;
                var pGrade = x[i].grade;
                var latLng = new google.maps.LatLng(pLatCoord,pLngCoord);
                var marker = new google.maps.Marker({
                    position: latLng,
                    icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|088',
                    map: map,
                    animation: google.maps.Animation.DROP,
                    //label: pLabel[plabelIndex++ % pLabel.length],
                    title: "grade: " + pGrade
                });
                markers.push(marker);
                //console.log(markers);
            }
        }

        function setMapOnAll() {
           for (var i = 0; i < markers.length; i++) {
             markers[i].setMap(null);
           }
         }
        
        function clearMarkers() {
            setMapOnAll(null);
            markers.length = 0;
        }
        
        function deleteMarkers() {
            clearMarkers();
            markers = [];
        }
        
        // Get list of places and render results.
        getPlaceList(url, function(response) {
            results.places = response;
            clearContents();
            deleteMarkers();
            placesList = Handlebars.templates.list({
                Places: results
            });
            $('#results').append(placesList);
            var dataList = results.places;
            //console.log(dataList);
            //console.log(markers);
            plotMap(dataList);
            return dataList;
        })
    });    
});


// Variables to hold coordinates and query options.
var coordinates = [];
var mapCoord = {};
var coordLat;
var coordLon;
var options = {};


// Create map and add user's current location
var map, infoWindow;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 47.6062, lng: 122.3321},
        zoom: 13.5
    });
    infoWindow = new google.maps.InfoWindow;


    // Get users current location.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            $('.init').addClass('hide');
            $('.container').removeClass('hide');
            mapCoord = {lat: position.coords.latitude, lng: position.coords.longitude};
            //coordLat = position.coords.latitude;
            //coordLon = position.coords.longitude;
            coordinates = [position.coords.latitude, position.coords.longitude];

            infoWindow.setPosition(mapCoord);
            infoWindow.setContent('You are here.');
            infoWindow.open(map);
            map.setCenter(mapCoord);
        }, function(error) {
            handleLocationError(true, infoWindow, map.getCenter());
            $('.init').addClass('hide');
            $('.error').removeClass('hide');
        }, {
            timeout: 15000
        });
    }
    // Otherwise, show error message.
    else {
        // Browswer doens't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
        $('.init').addClass('hide');
        $('.error').removeClass('hide');
    }
        
    return mapCoord;
}

// map error handling 
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
 }


// Template for calling the Seattle Health Inspection data API.
var query_template = 'https://data.kingcounty.gov/resource/gkhn-e8mn.json?$select=name,address,business_id,grade,latitude,longitude&$where=latitude between {{lat_1}} and {{lat_2}}%20AND%20longitude between {{lon_1}} and {{lon_2}}%20AND%20grade%20IS%20NOT%20NULL&$group=name,address,business_id,grade,latitude,longitude&$order=grade%20ASC&$limit={{limit}}';


// Handlebars helper function to format restaurant rating (1-4).
Handlebars.registerHelper('formatScore', function(grade) {
    if (grade == 1) {
        return "A: Excellent";
    } else if (grade == 2) {
        return "B: Good";
    } else if (grade == 3) {
        return "C: Okay";
    } else if (grade == 4) {
        return "D: Needs Improvement";
    } else {
        return "?";
    }
    return grade;
});

// Clear any displayed results.
function clearContents() {
    $("#results").empty();
}

// Make API call.
function getPlaceList(url, callback) {
    $.ajax({
        url: url,
        success: function(data, status) {
            callback.call(null, data);
        },
        error: function() {
            callback.call(null, []);
        }
    });
}

/*
 * Method to generate a bounding box given a lat/lon pair
 * Variation of the method detailed here:
 *   http://stackoverflow.com/questions/238260/how-to-calculate-the-bounding-box-for-a-given-lat-lng-location
 */
function getBoundingBox(centerPoint, distance) {
    var MIN_LAT, MAX_LAT, MIN_LON, MAX_LON, R, radDist, degLat, degLon, radLat, radLon, minLat, maxLat, minLon, maxLon, deltaLon;
    if (distance < 0) {
        return 'Illegal arguments';
    }
    // helper functions (degrees<–>radians)
    Number.prototype.degToRad = function() {
        return this * (Math.PI / 180);
    };
    Number.prototype.radToDeg = function() {
        return (180 * this) / Math.PI;
    };
    // coordinate limits
    MIN_LAT = (-90).degToRad();
    MAX_LAT = (90).degToRad();
    MIN_LON = (-180).degToRad();
    MAX_LON = (180).degToRad();
    // Earth's radius (mi)
    R = 3959;
    // angular distance in radians on a great circle
    radDist = distance / R;
    // center point coordinates (deg)
    degLat = centerPoint[0];
    degLon = centerPoint[1];
    // center point coordinates (rad)
    radLat = degLat.degToRad();
    radLon = degLon.degToRad();
    // minimum and maximum latitudes for given distance
    minLat = radLat - radDist;
    maxLat = radLat + radDist;
    // minimum and maximum longitudes for given distance
    minLon = void 0;
    maxLon = void 0;
    // define deltaLon to help determine min and max longitudes
    deltaLon = Math.asin(Math.sin(radDist) / Math.cos(radLat));
    if (minLat > MIN_LAT && maxLat < MAX_LAT) {
        minLon = radLon - deltaLon;
        maxLon = radLon + deltaLon;
        if (minLon < MIN_LON) {
            minLon = minLon + 2 * Math.PI;
        }
        if (maxLon > MAX_LON) {
            maxLon = maxLon - 2 * Math.PI;
        }
    }
    // a pole is within the given distance
    else {
        minLat = Math.max(minLat, MIN_LAT);
        maxLat = Math.min(maxLat, MAX_LAT);
        minLon = MIN_LON;
        maxLon = MAX_LON;
    }
    return {
        lat_1: minLat.radToDeg(),
        lon_1: minLon.radToDeg(),
        lat_2: maxLat.radToDeg(),
        lon_2: maxLon.radToDeg()
    };
};

