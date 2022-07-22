// Offset for Site Navigation
$('#siteNav').affix({
	offset: {
		top: 100
	}
})

var backgroundInterval = setInterval(function(){
    $(".blinky").toggleClass("backgroundRed");
 },300)