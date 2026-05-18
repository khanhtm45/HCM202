var currentBootstrapBreakPoint;	
var version;
//(function( $ ) {			
	function findBootstrapBreakPoints(e) {
		var envs = ['xs', 'sm', 'md', 'lg'];
		$el = $('<div>');
		$el.appendTo($('body'));
		for (var i = envs.length - 1; i >= 0; i--) {
			var env = envs[i];
			$el.addClass('hidden-'+env);
			if ($el.is(':hidden')) {
				$el.remove();
				try {
					//console.log(env);
				}catch(Exception){
						
				}
				if(env){
					currentBootstrapBreakPoint = env;
					version = '3.x';
					return env;					
				}
			}
		}
		return "unknown";
	}

//	$(window).resize(function(e){
//		findBootstrapBreakPoints(e);
//	});
//	$(window).scroll(function(e){
//		findBootstrapBreakPoints(e);
//	});
	$(document).ready(function(e){
		findBootstrapBreakPoints(e);
	});	
	
//}( jQuery ));