// ******* Constants and Global Variables *******

// Set the 'initialMapAddress' string to any valid location or address.
// This allows developers to configure the initial map position. Points of
// interest will be located close to this location.
const initialMapAddress = "Firenze, Italy";

// Search radius (in meters) used to limit Google Places API search results.
const searchRadius = 7000; 

// Variable initialMapLatLng will hold the geocode for the initialMapAdress.
var initialMapLatLng = '';
var map;
var geocoder;
var places = [];

// Defines the properties of a place
var Place = function(lat, lng, name){
    this.lat = lat;
    this.lng = lng;
    this.name = name;
    this.location = {lat: this.lat, lng: this.lng}
}

// Callback function used by Google Maps API to initialize the map area.
function initMap() {
    // Create Geocoder object to convert 'initialMapAddress'
    // into lat/lng values.
    geocoder = new google.maps.Geocoder();
    
    // Get the lat/lng values for 'initialMapAddress'.
    geocoder.geocode({
        address: initialMapAddress
    }, function(results, status){
        if (status == 'OK') {
            // Set initialMapLatLng with retrieved values.
            initialMapLatLng = results[0].geometry.location;

            // Since JQuery´s id selector returns a collection and the Map
            // class receives an HTML element, we must use [0] to select the
            // first element of the colletion.
            map = new google.maps.Map($("#map")[0],
            {
                center: initialMapLatLng,
                zoom: 16
            });

            setPointsOfInterest(initialMapLatLng);
        } else {
            alert('Geocoding API failed to geocode ' + initialMapAddress);
        }
    });    
}

// Retrieves a list of places near the specified Lat/Lng location.
function setPointsOfInterest(initialMapLatLng){
    var placesService = new google.maps.places.PlacesService(map);
    var request = {
        location: initialMapLatLng,
        radius: searchRadius,
        type: ['museum']
    };
    placesService.nearbySearch(request, function(results, status){
        if (status == 'OK') {
            $.each(results, function(index, result){
                places.push(new Place(result.geometry.location.lat(),
                                      result.geometry.location.lng(),
                                      result.name));
            });
            setMarkers(places);
        } else {
            alert('Place API failed to respond. Unable to retrieve points of interest near ' + initialMapAddress);
        }
    });
}

// Set markers representing each point of interest on the map.
function setMarkers(places){
    $.each(places, function(index, place){
        var marker = new google.maps.Marker({
            position: place.location,
            map: map,
            title: place.name
        });
    });
}

// Application ViewModel
var appViewModel = function(){
    this.places = places;    
};

// Activate knockout.js using JQuery, which will load Knockout after the DOM has finished loading.
jQuery(function($){
    ko.applyBindings(new appViewModel());
});
