// Set 'MAP_ADDRESS' to any valid location.
// This allows developers to configure the initial map position. Points of
// interest will be located close to this location.
const MAP_ADDRESS = 'Central Park, New York';

// Search radius (in meters) is used to limit Google Places API search results.
const SEARCH_RADIUS = 4000;

// Initial map zoom used by Google Places API.
const MAP_ZOOM = 15;

// Prevents zooming to far in when there is only one marker set.
const MAP_MAX_ZOOM = 17;

// Foursquare API constants.
const FOURSQUARE_API_VERSION = 20190223;
const FOURSQUARE_CLIENT_ID =
    'MHIUE3JSG2LWINMXBLQX1PDXJ2NOIQDLZOW2ZCQ2NKDFJNB4';
const FOURSQUARE_CLIENT_SECRET =
    'VTPCTEWLFVHAWX3VW3W1O4QHZAQXEUXDSUBIOXNVFYSDNIOM';
// Set the number of venues to be retrieved by Foursquare Venue Search API.
const NUMBER_OF_VENUES = 10;

// 'map' will hold Google Maps API´s map object.
var map;

// 'mapBounds' is used to fit all map markers on the user view.
var mapBounds;

// Variable used to set map bounds for filtered list items.
var filteredMapBounds;

// 'lastOpenedInfoWindow' receives an InfoWindow object. It keeps track
// of opened info windows allowing us to close them when they are not needed.
var lastOpenedInfoWindow;

// Place object definition
var Place = function(id, name, latitude, longitude){
    this.id = id;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.photos = [];
    this.description = '';
    this.getLocation = function(){
        return {lat: this.latitude, lng: this.longitude};
    };
    this.marker = '';
};

// Callback function used by Google Maps API to initialize the map area.
function initMap() {
    // Create Geocoder object to convert 'MAP_ADDRESS'
    // into latlng values.
    var geocoder = new google.maps.Geocoder();

    // Get the lat/lng values for 'MAP_ADDRESS'.
    geocoder.geocode({
        address: MAP_ADDRESS
    }, function(results, status){
        if (status == 'OK') {
            // 'initialMapLatLng' will hold the geocode for MAP_ADDRESS.
            var initialMapLatLng = results[0].geometry.location;
            
            // Since JQuery´s id selector returns a collection and the Map
            // class receives an HTML element, we must use [0] to select the
            // first element of the colletion.
            map = new google.maps.Map($("#map")[0],
            {
                center: initialMapLatLng,
                zoom: MAP_ZOOM,
                maxZoom: MAP_MAX_ZOOM
            });
            getFoursquareVenues();
            resizeMapArea();
        } else {
            alert('Geocoding API failed to geocode ' + MAP_ADDRESS);
        }
    });    
}

// This function uses Foursquare's API to fetch data on points of interest
// close to our MAP_ADDRESS.
function getFoursquareVenues(){
    var searchUrl = 'https://api.foursquare.com/v2/venues/search';
    jQuery.ajax({
        url: searchUrl,
        data: {
            near: MAP_ADDRESS,
            radius: SEARCH_RADIUS,
            limit: NUMBER_OF_VENUES,
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
                // Remove unwanted text inside parenthesis from venue names.
                if (venue.name.indexOf('(') > 0) {
                    venue.name =
                        venue.name.substring(0,venue.name.indexOf('(')).trim();
                }
                var place = new Place(venue.id,
                                      venue.name,
                                      venue.location.lat,
                                      venue.location.lng);
                places.push(place);
                //setPlaceDescription(place);
                //setPlacePhotos(place);                
            });
            mapBounds = new google.maps.LatLngBounds();
            setMarkers(places);
            panAndZoomToFitMarkers(mapBounds);
            // Initialize Knockout after all asynchronous calls are done.
            ko.applyBindings(new appViewModel(places, map));
        }
    });
}

// Adjust map's pan and zoom settings to fit all markers on screen.
function panAndZoomToFitMarkers(mapBounds){
    map.setCenter(mapBounds.getCenter());
    map.fitBounds(mapBounds);
    map.panToBounds(mapBounds);
}

// Function 'setPlaceDescription' will save each venue's description.
function setPlaceDescription(place){
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
}

// 'setPlacePhotos' will save photos from each venue.
function setPlacePhotos(place) {
    var searchUrl = 'https://api.foursquare.com/v2/venues/' + place.id +
        '/photos';
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
}

// Set markers representing each point of interest on the map.
function setMarkers(places){
    $.each(places, function(index, place){
        var marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            position: place.getLocation(),
            title: place.name
        });
        var markerLoc = new google.maps.LatLng(marker.position.lat(),
            marker.position.lng());
        mapBounds.extend(markerLoc);
        //Create a click listener for the marker.
        marker.addListener('click', function(){
            toggleMarkerAnimation(marker);
            openInfoWindow(place);
        });
        place.marker = marker;
    });
}

// Opens an infowindow with data from a specific venue.
function openInfoWindow(place){
    if (lastOpenedInfoWindow) {
        lastOpenedInfoWindow.close();
    }
    // If there is no description available for a venue, tell the user so.
    var description = place.description ? place.description : 'Sorry, no ' +
        'description available.';
    var infoWindowContent = '<h6 class="info-heading">' +
        place.name + '</h6>' + '<img class="info-img" src="' +
        place.photos[0] + '" alt="Location image" />' +
        '<p class="info-description">' + description + '</p>' + 
        '<p class="info-attribution">Source: Foursquare.com</p>';
    var infowindow = new google.maps.InfoWindow({
        content: infoWindowContent
    });
    lastOpenedInfoWindow = infowindow;
    infowindow.open(map, place.marker);
}

// Shows marker on map.
function showMarkers(places, map) {
    $.each(places, function(index, place){
        place.marker.setMap(map);
    });
}

// Animate selected marker.
function toggleMarkerAnimation(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){
            marker.setAnimation(null);
        }, 1500);
    }
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
    self.neighborhood = MAP_ADDRESS;
    self.filterText = ko.observable('Filter');
    self.placeList = ko.observableArray(places);
    self.searchString = ko.observable();
    self.focusOnMarker = function(place) {
        // In small screens, the list area should hide after the user
        // clicks a list item. The if statement below will hide it, displaying
        // the map container in full screen.
        if($(window).width() < 768){
            $('#list-area').toggleClass('showElement');
            $('#map-container').toggleClass('hideElement');
        }
        panAndZoomToFitMarkers(!filteredMapBounds ?
            mapBounds : filteredMapBounds);
        toggleMarkerAnimation(place.marker);
        openInfoWindow(place);
    };
    self.filteredList = ko.computed(function(){
        // Close any opened info windows.
        if (lastOpenedInfoWindow){
            lastOpenedInfoWindow.close();
        }
        // Show all markers if no search string is typed.
        if (!self.searchString()) {
            showMarkers(self.placeList(), map);
            panAndZoomToFitMarkers(mapBounds);
            return self.placeList();
        } else {
            // Set new map bounds variable for filtered markers.
            filteredMapBounds = new google.maps.LatLngBounds();
            // Filter placeList according to user input in 'searchString'.
            var filteredPlaces =
                ko.utils.arrayFilter(self.placeList(), function(place){
                var lowerCaseName = place.name.toLowerCase();
                var lowerCaseSearchString = self.searchString().toLowerCase();
                // Check if place name contains the search string.
                if (!lowerCaseName.includes(lowerCaseSearchString)){
                    // Remove marker from map if name does not contain
                    // search string. This marker will not be included in
                    // the new 'filteredMapBounds' variable.
                    place.marker.setMap(null);
                } else {
                    // If the search string is found,
                    // add place to new map bound. This will allow zooming
                    // and panning to filtered markers.
                    var markerLoc =
                        new google.maps.LatLng(place.marker.position.lat(),
                        place.marker.position.lng());
                    filteredMapBounds.extend(markerLoc);
                }
                return lowerCaseName.includes(lowerCaseSearchString);
            });
            showMarkers(filteredPlaces, map);
            panAndZoomToFitMarkers(filteredMapBounds);
            return filteredPlaces;
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
    self.toggleMenu = function(){
        if($(window).width() < 768){
            $('#list-area').toggleClass('showElement');
            $('#map-container').toggleClass('hideElement');
        } else {
            $('#list-area').removeClass('showElement');
            $('#map-container').removeClass('hideElement');
        }
        panAndZoomToFitMarkers(!filteredMapBounds ?
            mapBounds : filteredMapBounds);
    };
};