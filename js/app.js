// Function used to initialize the map area.
function initMap() {

    // Set the 'initialMapLocation' string to any valid location or address.
    // This allows developers to configure the initial map position. Points of
    // interest will be located close to this location.
    var initialMapLocation = "Bras de Pina, RJ"

    // Create Geocoder object to convert 'initialMapLocation'
    // into lat/lng values.
    var geocoder = new google.maps.Geocoder();
    
    // Get the lat/lng values for 'initialMapLocation'.
    geocoder.geocode({
        address: initialMapLocation
    }, function(results, status){
        if (status == 'OK') {
            // Since JQuery´s id selector returns a collection and the Map
            // class receives an HTML element, we must use [0] to select the
            // first element of the colletion.
            var map = new google.maps.Map($("#map")[0],
            {
                center: results[0].geometry.location,
                zoom: 15
            });
        } else {
            alert('Geocoding API failed to geocode ' + initialMapLocation);
        }
    });

    
}

// Application ViewModel
var appViewModel = {

    //Create a list of places/points of interest by using Google Places API
    //Generate markers for those places
    //Create a list view displaying those places next to the map view.
    
};

// Activate knockout.js using JQuery, which will load Knockout after the DOM has finished loading.
$(function(){
    ko.applyBindings(appViewModel);
});
