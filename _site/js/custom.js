// Offset for Site Navigation
$('#siteNav').affix({
	offset: {
		top: 100
	}
})

var backgroundInterval = setInterval(function(){
    $(".blinky").toggleClass("backgroundRed");
 },300)

$("#slider").on("input change", (e)=>{
  const sliderPos = e.target.value;
  // Update the width of the foreground image
  $('.foreground-img').css('width', `${sliderPos}%`)
  // Update the position of the slider button
  $('.slider-button').css('left', `calc(${sliderPos}% - 18px)`)
});
