// ******* Constants and Global Variables *******

// Set the 'INITIAL_MAP_ADDRESS' string to any valid location or address.
// This allows developers to configure the initial map position. Points of
// interest will be located close to this location.
const INITIAL_MAP_ADDRESS = "Firenze, Italy";

// Search radius (in meters) used to limit Google Places API search results.
const SEARCH_RADIUS = 4000; 
const MAP_ZOOM = 15;
const FOURSQUARE_API_VERSION = 20190223;
const FOURSQUARE_CLIENT_ID = 'MHIUE3JSG2LWINMXBLQX1PDXJ2NOIQDLZOW2ZCQ2NKDFJNB4';
const FOURSQUARE_CLIENT_SECRET = 'VTPCTEWLFVHAWX3VW3W1O4QHZAQXEUXDSUBIOXNVFYSDNIOM';
var map;

// Defines the properties of a place
var Place = function(id, name, latitude, longitude){
    this.id = id;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.photos = [];
    this.getLocation = function(){
        return {lat: this.latitude, lng: this.longitude};
    };
    this.getMarkerInfo = function() {
        return {name: this.name, location: this.getLocation(), photos: this.photos};
    };
    this.marker;
};

// Callback function used by Google Maps API to initialize the map area.
function initMap() {
    // Create Geocoder object to convert 'INITIAL_MAP_ADDRESS'
    // into lat/lng values.
    var geocoder = new google.maps.Geocoder();
    
    // Get the lat/lng values for 'INITIAL_MAP_ADDRESS'.
    geocoder.geocode({
        address: INITIAL_MAP_ADDRESS
    }, function(results, status){
        if (status == 'OK') {
            // Variable initialMapLatLng will hold the geocode for the initialMapAdress.
            // Set initialMapLatLng with retrieved values.
            var initialMapLatLng = results[0].geometry.location;
            
            // Since JQuery´s id selector returns a collection and the Map
            // class receives an HTML element, we must use [0] to select the
            // first element of the colletion.
            map = new google.maps.Map($("#map")[0],
            {
                center: initialMapLatLng,
                zoom: MAP_ZOOM
            });
            getPointsOfInterest();
            resizeMapArea();
        } else {
            alert('Geocoding API failed to geocode ' + INITIAL_MAP_ADDRESS);
        }
    });    
};

function getPointsOfInterest(){
    // Foursquare Search for Venues API call.
    var searchUrl = 'https://api.foursquare.com/v2/venues/search';
    jQuery.ajax({
        url: searchUrl,
        data: {
            near: INITIAL_MAP_ADDRESS,
            radius: SEARCH_RADIUS,
            limit: 30,
            v: FOURSQUARE_API_VERSION,
            categoryId: '4d4b7104d754a06370d81259',
            client_id: FOURSQUARE_CLIENT_ID,
            client_secret: FOURSQUARE_CLIENT_SECRET
        },
        dataType: 'json',
        error: function() {
            alert('Foursquare API failed to return venues.');
        },
        success: function(data) {
            var places = [];
            $.each(data.response.venues, function(index, venue){
                var place = new Place(venue.id,
                                      venue.name,
                                      venue.location.lat,
                                      venue.location.lng);
                places.push(place);
            });
            setMarkers(places);
            // Initialize Knockout after all asynchronous calls are done.
            ko.applyBindings(new appViewModel(places, map));
        }
    });
};

function getPhotos(placeId) {
    // Foursquare Search for Venues API call.
    var searchUrl = 'https://api.foursquare.com/v2/venues/' + placeId + '/photos';
    jQuery.ajax({
        url: searchUrl,
        data: {
            limit: 10,
            v: FOURSQUARE_API_VERSION,
            client_id: FOURSQUARE_CLIENT_ID,
            client_secret: FOURSQUARE_CLIENT_SECRET
        },
        dataType: 'json',
        error: function() {
            alert('Foursquare API failed to return venue photos.');
            return [];
        },
        success: function(data) {
            var photos = [];
            $.each(data.response.photos.items, function(index, item){
                var prefix = item.prefix;
                var suffix = item.suffix;
                var size = '100x36';
                var photoURL = prefix + size + suffix;
                photos.push(photoURL);
            });
            return photos;
        }
    });
};

// Set markers representing each point of interest on the map.
function setMarkers(places){
    $.each(places, function(index, place){
        var marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            position: place.getLocation(),
            title: place.name
        });
        //Create a click listener for the marker.
        marker.addListener('click', function(){
            map.panTo(marker.getPosition());
            toggleMarkerAnimation(marker);

            if(place.photos.length == 0) {
                place.photos = getPhotos(place.id);
            };

            var infoWindowContent = '<h6>' + place.name + '</h6>' +
                '<img src="' + place.photos[0] + '" alt="Location image" />';

            var infowindow = new google.maps.InfoWindow({
                content: infoWindowContent
            });
            
            infowindow.open(map, marker);
        })
        // Set a 'marker' property for each place.
        place.marker = marker;
    });
};

// Shows all marker on map.
function showAllMarkers(places, map) {
    $.each(places, function(index, place){
        place.marker.setMap(map);
    });
};

function toggleMarkerAnimation(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){
            marker.setAnimation(null);
        }, 1500);
    };
};

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
};

// Application ViewModel
var appViewModel = function(places, map){
    var self = this;
    self.neighborhood = INITIAL_MAP_ADDRESS;
    self.placeList = ko.observableArray(places);
    self.searchString = ko.observable();
    self.focusOnMarker = function(place) {
        map.panTo(place.getLocation());
        toggleMarkerAnimation(place.marker);
    };
    self.filteredList = ko.computed(function(){
        if (!self.searchString()) {
            showAllMarkers(self.placeList(), map);
            return self.placeList();
        } else {
            return ko.utils.arrayFilter(self.placeList(), function(place){
                if (!place.name.toLowerCase().includes(self.searchString().toLowerCase())){
                    place.marker.setMap(null);
                }
                return place.name.toLowerCase().includes(self.searchString().toLowerCase());
            })
        }
    });
};