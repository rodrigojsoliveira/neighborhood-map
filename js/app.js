// Function used to initialize the map area.
function initMap() {
    // Since JQuery´s id selector returns a collection and the Map class
    // receives an HTML element, we must use [0] to select the first element
    // of the colletion.
    var map = new google.maps.Map($("#map")[0],
    {
        center: {lat: -34.397, lng: 150.644},
        zoom: 8
    });
}

// Application ViewModel
var appViewModel = {
    
};

// Activate knockout.js using JQuery, which will load Knockout after the DOM has finished loading.
$(function(){
    ko.applyBindings(appViewModel);
});
