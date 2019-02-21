// ******* Constants and Global Variables *******

// Set the 'initialMapAddress' string to any valid location or address.
// This allows developers to configure the initial map position. Points of
// interest will be located close to this location.
const initialMapAddress = "Firenze, Italy";

// Search radius (in meters) used to limit Google Places API search results.
const searchRadius = 4000; 

const mapZoom = 15;

// Defines the properties of a place
var Place = function(latitude, longitude, name){
    this.name = name;
    this.location = {lat: latitude, lng: longitude}
}

// Callback function used by Google Maps API to initialize the map area.
function initMap() {
    // Create Geocoder object to convert 'initialMapAddress'
    // into lat/lng values.
    var geocoder = new google.maps.Geocoder();
    
    // Get the lat/lng values for 'initialMapAddress'.
    geocoder.geocode({
        address: initialMapAddress
    }, function(results, status){
        if (status == 'OK') {
            // Variable initialMapLatLng will hold the geocode for the initialMapAdress.
            // Set initialMapLatLng with retrieved values.
            var initialMapLatLng = results[0].geometry.location;

            // Since JQuery´s id selector returns a collection and the Map
            // class receives an HTML element, we must use [0] to select the
            // first element of the colletion.
            var map = new google.maps.Map($("#map")[0],
            {
                center: initialMapLatLng,
                zoom: mapZoom
            });
            setPointsOfInterest(initialMapLatLng, map);
            resizeMapArea();
        } else {
            alert('Geocoding API failed to geocode ' + initialMapAddress);
        }
    });    
}

// Retrieves a list of places near the specified Lat/Lng location.
function setPointsOfInterest(initialMapLatLng, map){
    var placesService = new google.maps.places.PlacesService(map);
    var request = {
        location: initialMapLatLng,
        radius: searchRadius,
        type: ['museum']
    };
    placesService.nearbySearch(request, function(results, status){
        if (status == 'OK') {
            var places = [];
            $.each(results, function(index, result){
                var place = new Place(result.geometry.location.lat(),
                                                result.geometry.location.lng(),
                                                result.name);
                places.push({name: place.name, location: place.location});
            });
            setMarkers(places, map);
            // Initialize Knockout after all asynchronous calls are done.
            ko.applyBindings(new appViewModel(places, map));
        } else {
            alert('Place API failed to respond. Unable to retrieve points of interest near ' + initialMapAddress);
        }
    });
}

// Set markers representing each point of interest on the map.
function setMarkers(places, map){
    $.each(places, function(index, place){
        var marker = new google.maps.Marker({
            position: place.location,
            map: map,
            title: place.name
        });
    });
}

// This function is used to resize the Map area properly. It fixes 
// Google Maps' div element being rendered with its height property set to 0
// when using Bootstrap.
function resizeMapArea() {
    $(window).resize(function () {
        var windowHeight = $(window).height(),
            // 'topOffset' is used to avoid rendering a 
            // vertical scrollbar on the right side of the webpage.
            // Change this value as needed.
            topOffset = 57; 
    
        $('#map').css('height', (windowHeight - topOffset));
    }).resize();
}

// Application ViewModel
var appViewModel = function(places, map){
    var self = this;
    self.neighborhood = initialMapAddress;
    self.myPlaces = ko.observableArray(places);
    self.searchString = ko.observable();
    self.setMapCenter = function(place) {
        map.setCenter(place.location);
    };
    self.filteredList = ko.computed(function(){
        if (!self.searchString()) {
            return self.myPlaces();
        } else {
            return ko.utils.arrayFilter(self.myPlaces(), function(place){
                return place.name.toLowerCase().includes(self.searchString().toLowerCase());
            })
        }
    });
    self.setFilter = function(userInput){
        console.log(userInput);
        self.searchString(userInput);
        //set filtered markers
    }
};


