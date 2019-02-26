// ******* Constants and Global Variables *******

// Set the 'MAP_ADDRESS' string to any valid location or address.
// This allows developers to configure the initial map position. Points of
// interest will be located close to this location.
const MAP_ADDRESS = "Florence, Italy";
const MAP_CITY = "Florence";

// Search radius (in meters) used to limit Google Places API search results.
const SEARCH_RADIUS = 4000; 
const MAP_ZOOM = 15;
const FOURSQUARE_API_VERSION = 20190223;
const FOURSQUARE_CLIENT_ID = 'MHIUE3JSG2LWINMXBLQX1PDXJ2NOIQDLZOW2ZCQ2NKDFJNB4';
const FOURSQUARE_CLIENT_SECRET = 'VTPCTEWLFVHAWX3VW3W1O4QHZAQXEUXDSUBIOXNVFYSDNIOM';
var map;
var lastOpenedInfoWindow;

// Defines the properties of a place
var Place = function(id, name, latitude, longitude){
    this.id = id;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.pageId = '';
    this.photos = [];
    this.description = '';
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
    // Create Geocoder object to convert 'MAP_ADDRESS'
    // into lat/lng values.
    var geocoder = new google.maps.Geocoder();
    
    // Get the lat/lng values for 'MAP_ADDRESS'.
    geocoder.geocode({
        address: MAP_ADDRESS
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
            getFoursquareVenues();
            resizeMapArea();
        } else {
            alert('Geocoding API failed to geocode ' + MAP_ADDRESS);
        }
    });    
};



function getFoursquareVenues(){
    // Foursquare Search for Venues API call.
    var searchUrl = 'https://api.foursquare.com/v2/venues/search';
    jQuery.ajax({
        url: searchUrl,
        data: {
            near: MAP_ADDRESS,
            radius: SEARCH_RADIUS,
            limit: 5,
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
                if (venue.name.indexOf('(') > 0) {
                    venue.name = venue.name.substring(0,venue.name.indexOf('(')).trim();
                };
                var place = new Place(venue.id,
                                      venue.name,
                                      venue.location.lat,
                                      venue.location.lng);
                places.push(place);
                setPlaceDetails(place)
                setPlacePhotos(place);
                // getWikipediaPageIds(places);
                
                
            });
            setMarkers(places);
            // Initialize Knockout after all asynchronous calls are done.
            ko.applyBindings(new appViewModel(places, map));
        }
    });
};

function setPlaceDetails(place){
    var searchUrl = 'https://api.foursquare.com/v2/venues/' + place.id;
    jQuery.ajax({
        url: searchUrl,
        data: {
            v: FOURSQUARE_API_VERSION,
            client_id: FOURSQUARE_CLIENT_ID,
            client_secret: FOURSQUARE_CLIENT_SECRET
        },
        dataType: 'json',
        error: function() {
            alert('Foursquare API failed to return venue details.');
        },
        success: function(data) {
            place.description = data.response.venue.description;
        }
    });
};

function setPlacePhotos(place) {
    // Foursquare Search for Venues API call.
    var searchUrl = 'https://api.foursquare.com/v2/venues/' + place.id + '/photos';
    jQuery.ajax({
        url: searchUrl,
        data: {
            limit: 1,
            v: FOURSQUARE_API_VERSION,
            client_id: FOURSQUARE_CLIENT_ID,
            client_secret: FOURSQUARE_CLIENT_SECRET
        },
        dataType: 'json',
        error: function() {
            alert('Foursquare API failed to return venue photos.');
        },
        success: function(data) {
            var photos = [];
            $.each(data.response.photos.items, function(index, item){
                var prefix = item.prefix;
                var suffix = item.suffix;
                var size = 'width300';
                var photoURL = prefix + size + suffix;
                photos.push(photoURL);
            });
            place.photos = photos;
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
            toggleMarkerAnimation(marker);
            openInfoWindow(place);
            
        })
        // Set a 'marker' property for each place.
        place.marker = marker;
    });
};

function openInfoWindow(place){
    if (lastOpenedInfoWindow) {
        lastOpenedInfoWindow.close();
    };

    var description = place.description ? place.description : 'Sorry, no description available.';
    var infoWindowContent = '<h6 class="info-heading">' + place.name + '</h6>' +
        '<img class="info-img" src="' + place.photos[0] + '" alt="Location image" />' +
        '<p class="info-description">' + description + '</p>' + 
        '<p class="info-attribution">Source: Foursquare.com</p>';

    var infowindow = new google.maps.InfoWindow({
        content: infoWindowContent
    });

    lastOpenedInfoWindow = infowindow;
    
    infowindow.open(map, place.marker);
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
    self.neighborhood = MAP_ADDRESS;
    self.filterText = ko.observable('Filter');
    self.placeList = ko.observableArray(places);
    self.searchString = ko.observable();
    self.focusOnMarker = function(place) {
        toggleMarkerAnimation(place.marker);
        openInfoWindow(place)
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
    self.setClearText = function() {
        $("#filter-button").text('Clear');
        $("#filter-button").toggleClass("pointerCursor");
    };
    self.setFilterText = function(){
        $("#filter-button").text('Filter');
        $("#filter-button").toggleClass("pointerCursor");
    };
    self.clearFilter = function(){
        self.searchString('');
    };
};