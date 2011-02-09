/**
 * WYGify
 * jQuery plugin that converts a textarea into a WYSIWYG editor
 * 
 * Based on ideas in the SimpleTextEditor by Cezary Tomczak
 * 
 * @author Jan Hartigan
 */
(function($) {
	var editors = []; 
	
	/**
	 * editor constructor function that runs the init method
	 * 
	 * @param jQueryObject	$el
	 * @param Object		options
	 */
	function editor ($el, options) {
		this.init($el, options);
	}
	
	editor.prototype = {
		/* A jQuery object representing the editor's container
		 * 
		 * jQuery Object
		 */
		$wyg: null,
		
		/* A jQuery object representing the textarea on which the editor is built
		 * 
		 * jQuery Object
		 */
		$textarea: null,
		
		/* The context on which we can access the iframe's document object
		 * 
		 * iframe content window element
		 */
		frame: null,
		
		/* The id of the textarea
		 * 
		 * String
		 */
		id: '',
		
		/* The full width of the textarea including padding and borders
		 * 
		 * int
		 */
		textarea_width: 0,
		
		/* The full height of the textarea including padding and borders
		 * 
		 * int
		 */
		textarea_height: 0,
		
		/* An object containing bools for various relevant browser types
		 * 
		 * Object
		 */
		browser: {},
		
		/* The options object which can be overridden by the user on init
		 * 
		 * Object
		 */
		options: {
			
			/* An object with boolean values correlating to particular WYSIWYG buttons (if true it'll show up, if false it won't)
			 * 
			 * Object
			 */
			buttons: {
				bold		: true,
				italic		: true,
				underline	: true,
				createlink	: true,
				insertimage	: true,
				youtube		: false
			},
			
			/* An object with string values for the images to be used for particular WYSIWYG buttons
			 * 
			 * Object
			 */
			icons: {
				bold		: 'md_bold.jpg',
				italic		: 'md_italic.jpg',
				underline	: 'md_underline.jpg',
				createlink	: 'md_link.jpg',
				insertimage	: 'md_image.jpg',
				youtube		: 'md_youtube.jpg'
			},
			
			/* The full path the the css file to be used in the iframe (leave blank if you don't need this)
			 * 
			 * String
			 */
			cssFile		: '',
			
			/* The base path to be used for images (include a leading and trailing slash)
			 * 
			 * String
			 */
			base_image_path: '/images/',
			
			/* The character set to be used in the iframe 
			 * 
			 * String
			 */
			charset		: 'iso-8859-1',
			
			/* Determines whether or not to adjust the editor's height as the content changes
			 * 
			 * bool
			 */
			adjustContainerHeight: true,
			
			/* The maximum height allowed for the editor (only matters if adjustContainerHeight is set to true)
			 * 
			 * int
			 */
			maxContainerHeight: 350,
			
			/* The minimum height allowed for the editor (only matters if adjustContainerHeight is set to true)
			 * 
			 * int
			 */
			minContainerHeight: 150,
			
			/* A boolean that overrides the minContainerHeight option with the original textarea's height if set to true.
			 * If adjustContainerHeight is set to false, this doesn't do anything
			 * 
			 * bool
			 */
			minHeightIsTextareaHeight: true,
			
			/* If this is set to something other than 0, it will set the editor width to this
			 * 
			 * int
			 */
			width: 0,
			
			/* If this option is set to true, it will run JavaScript's encodeURI() function on the editor's value when it's saving it
			 * back into the progenitor textarea. This way, if you have an automatic XSS filter on the server, a form submission including
			 * the textarea won't strip the values of the editor
			 * 
			 * bool
			 */
			encodeIntoTextarea: false,
			
			/* If this is set to true, when you destroy wygify for a textarea, it will also clear the contents of the textarea
			 * 
			 * bool
			 */
			clearTextareaOnDestroy: true,
			
			/* The CSS margin value for the container
			 * 
			 * String
			 */
			margin: '0 0 14px',
			
			/* Whether or not to enable tab switching. If this is on
			 * 
			 * bool
			 */
			enableTabSwitching: false,
			
			/* The id of the previous element in the tab index. This only needs to be filled if enableTabSwitching is true
			 * 
			 * String
			 */
			prevTabElement: '',
			
			/* The id of the next element in the tab index. This only needs to be filled if enableTabSwitching is true
			 * 
			 * String
			 */
			nextTabElement: '',
			
			/* The font family to be used inside the editor (will not affect the output, only for visual purposes)
			 * 
			 * String
			 */
			editorFontFamily: 'Arial, Helvetica, sans-serif',
			
			/* The font size to be used inside the editor (will not affect the output, only for visual purposes)
			 * 
			 * String
			 */
			editorFontSize: '14px',
			
			/* If this is not an empty string, it will be the URI used as the pre-focus background of the iframe's body. When the focus is set
			 * to the editor, it will forever disappear.
			 * 
			 * String
			 */
			preFocusBackground: ''
		},
		
		/**
		 * init function
		 * 
		 * @param jQueryObj		$textarea
		 * @param Object		options
		 */
		init: function ($textarea, options) {
			var self = this;
			
			this.browser = {ie: Boolean(document.body.currentStyle), gecko: (navigator.userAgent.toLowerCase().indexOf("gecko") != -1)};
			
			if (!(document.designMode && (this.browser.ie || this.browser.gecko))) {
				console.log("This browser is not supported by wygify"); return;
			}
			
			//extend the options object
			$.extend(this.options, options);
			
			//get the id of the textarea
			this.id = $textarea.attr('id');
			
			//store the textarea object
			this.$textarea = $textarea;
			
			//create the editor inside of its container
			this.$wyg = $('<div id="'+$textarea.attr('id')+'-wyg">'+ this.getEditorHtml() +'</div>');
			this.$wyg.insertBefore(this.$textarea);
			
			//set up the design mode
			if (this.browser.ie) {
                this.frame = frames[this.id+"-frame"];
            } else if (this.browser.gecko) {
                this.frame = document.getElementById(this.id+"-frame").contentWindow;
            }
			
			this.frame.document.designMode = "on";
			this.frame.document.open();
			this.frame.document.write(this.getFrameHtml());
			this.frame.document.close();
			
			//set up the buttons
			this.$wyg.find('td > img').each(function(ind, el) {
				var $this = $(this);
				
				$this.click(function() {
					self.execCommand($this.attr('title'));
				});
			});
			
			this.insertHtmlFromTextarea();
			this.$textarea.hide();
			
			//set up the resizing handler
			if (this.options.adjustContainerHeight) {
				$(this.frame.document).bind('keyup click', function() {
					self.setContainerHeight();
					self.retreiveContents();
				});
			}
			
			this.setContainerHeight();
			
			//set up the event handlers for tabbing
			if (this.options.enableTabSwitching) {
				this.enableTabSwitching();
			}
		},
		
		/**
		 * Gets the width + padding + border of the textarea
		 * 
		 * @return int
		 */
		getTextAreaWidth: function() {
			var width = 0;
			
			if (this.textarea_width)
				return this.textarea_width;
			
			if (this.options.width)
				return this.textarea_width = this.options.width;
			
			width += this.$textarea.width();
			width += parseInt(this.$textarea.css('padding-left'));
			width += parseInt(this.$textarea.css('padding-right'));
			
			return this.textarea_width = width;
		},
		
		/**
		 * Gets the height + padding + border of the textarea
		 * 
		 * @return int
		 */
		getTextAreaHeight: function() {
			var height = 0;
			
			if (this.textarea_height)
				return this.textarea_height;
			
			height += this.$textarea.height();
			height += parseInt(this.$textarea.css('padding-left'));
			height += parseInt(this.$textarea.css('padding-right'));
			
			if (this.options.minHeightIsTextareaHeight)
				this.options.minContainerHeight = height;
			
			return this.textarea_height = height;
		},
		
		/**
		 * Gets the html string of the editor's container and contents (including the basic iframe element but no contents of the iframe)
		 * This is done because the iframe needs to be edited using its contentWindow after it's already inserted into the DOM
		 * 
		 * @return String
		 */
		getEditorHtml: function() {
	        var self = this,
				html = "",
				width = this.getTextAreaWidth(),
				height = this.getTextAreaHeight(),
				margin = this.options.margin,
				tabIndex = this.$textarea.attr('tabindex');
			
	        html += '<div class="wyg" style="width:'+width+'px; margin:'+margin+';">';
	        html += '<div class="wyg-bar"><table id="'+this.id+'-buttons" cellspacing="0" cellpadding="0" style="width:auto"><tr>';
			
			$.each(this.options.buttons, function(ind, el) {
				if (el) {
					html += '<td class="wyg-button">' +
								'<img src="' + self.options.base_image_path + self.options.icons[ind] + '" alt="' + ind + '" title="' + ind + '">' +
							'</td>';
				}
			});
			
			html += '</tr></table></div>';
	        html += '<div class="wyg-frame" style="height:'+height+'px;">' +
						'<iframe id="'+this.id+'-frame" frameborder="0"'+(tabIndex?' tabindex="'+tabIndex+'"':'')+'></iframe>' +
					'</div>';
	        html += '</div>';
			
			return html;
	    },
		
		/**
		 * Gets the html for the frame in the editor
		 * 
		 * @return String
		 */
		getFrameHtml: function() {
	        var html = "";
			
	        html += '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">' +
	        		'<html><head>' +
	        			'<meta http-equiv="Content-Type" content="text/html; charset='+this.options.charset+'">' +
	        			'<title>SimpleTextEditor frame</title>' +
	        			'<style type="text/css">pre { background-color: #eeeeee; padding: 0.75em 1.5em; border: 1px solid #dddddd; }</style>' +
	        			(this.cssFile ? '<link rel="stylesheet" type="text/css" href="'+this.cssFile+'">' : '') + 
	        			'<style type="text/css">' +
							'html,body { cursor: text; } ' +
							'body { margin: 0.5em;padding: 0;' + 
										'font-family: ' + this.options.editorFontFamily + ';' +
										'font-size:' + this.options.editorFontSize + ';' +
										'background-repeat:no-repeat;' +
										(this.options.preFocusBackground != ''?'background-image:url(' + this.options.preFocusBackground + ');':'')+
									'}' +
						'</style>' +
	        		'</head>' + 
					'<body onfocus="document.body.style.backgroundImage = \'none\';">' +
						this.$textarea.val() +
					'</body></html>';
			
			return html;
	    },
		
		/**
		 * Executes the command associated with the clicked button.
		 * 
		 * @param String	cmd => 'bold', 'italic'...
		 * @param String	value
		 */
		execCommand: function(cmd, value) {
			if (cmd == "createlink" && !value) {
	            var url = prompt("Enter URL:", "");
	            if (url) {
	                this.frame.focus();
	                this.frame.document.execCommand("unlink", false, null);
	                if (this.browser.ie) this.frame.document.execCommand(cmd, false, "wygify://wygify/"+url);
	                else if (this.browser.gecko) this.frame.document.execCommand(cmd, false, url);
	                this.frame.focus();
	            }
	        } else if (cmd == "insertimage" && !value) {
	            var imageUrl = prompt("Enter Image URL:", "");
	            if (imageUrl) {
	                this.frame.focus();
	                this.frame.document.execCommand(cmd, false, imageUrl);
	                this.frame.focus();
	            }
	        } else {
	            this.frame.focus();
	            this.frame.document.execCommand(cmd, false, value);
	            this.frame.focus();
	        }
			
			this.setContainerHeight();
			this.retreiveContents();
		},
		
		/**
		 * Inserts the textarea's value into the iframe
		 */
		insertHtmlFromTextarea: function() {
	        try {
				var val = this.$textarea.val();
				
				if (this.options.encodeIntoTextarea)
					val = decodeURI(val);
				
				this.frame.document.body.innerHTML = this.lockUrls(val);
			} catch(e) {
				setTimeout(this.insertHtmlFromTextarea, 10);
			}
	    },
		
		/**
		 * Enables tab switching to and from the previous and the next elements
		 */
		enableTabSwitching: function() {
			var self = this;
			
			$(this.frame.document).keypress(function(e) {
				if (e.keyCode == 9) {
					if (e.shiftKey) {
						$('#' + self.options.prevTabElement).focus();
						$('#' + self.options.prevTabElement).blur();
						$('#' + self.options.prevTabElement).focus();
					} else {
						$('#' + self.options.nextTabElement).focus();
						$('#' + self.options.nextTabElement).blur();
						$('#' + self.options.nextTabElement).focus();
					}
					
					$(self.frame.document).find('.Apple-tab-span').remove();
					
					return false;
				}
			});
		},
		
		/**
		 * Sets the height of the container depending on the height of the iframe's document 
		 */
		setContainerHeight: function() {
			if (!this.options.adjustContainerHeight)
				return false;
			
			var frameHeight = this.browser.ie ? $(this.frame.document).height() : $(this.frame.document.body).height();
			
			if (frameHeight > this.options.maxContainerHeight)
				frameHeight = this.options.maxContainerHeight;
			else if (frameHeight < this.options.minContainerHeight)
				frameHeight = this.options.minContainerHeight;
			
			this.$wyg.find('.wyg-frame').height(frameHeight);
		},
		
		/**
		 * Gets the content of the iframe and returns it as a string
		 * 
		 * @return String
		 */
		getContent: function() {
	        try {
				return this.unlockUrls(this.frame.document.body.innerHTML);
			} catch (e) {
				console.log("There was an error getting the content of the wygify editor");
				return '';
			} 
	    },
		
		/**
		 * Clears the contents of the iframe and the textarea
		 */
		clearContents: function() {
	        this.$textarea.val('');
			$(this.frame.document.body).html('');
			this.setContainerHeight();
	    },
		
		/**
		 * Scrapes the content from the iframe using getContent and reinserts it into the textarea
		 */
		retreiveContents: function() {
			var val = this.getContent();
			
			if (this.options.encodeIntoTextarea)
				val = encodeURI(val);
			
			this.$textarea.val(val);
			this.$textarea.attr('uriencoded', 'true');
		},
		
		/**
		 * Converts anchor element href http strings to and arbitrary sequence so we can pass it into the iframe
		 * 
		 * @param String
		 */
		lockUrls: function(s){
			if (this.browser.gecko) 
				return s;
			
			return s.replace(/href=["']([^"']*)["']/g, 'href="wygify://wygify/$1"');
		},
		
		/**
		 * Converts back anchor element href http strings from the arbitrary sequence 
		 * 
		 * @param String
		 */
		unlockUrls: function(s) {
	        if (this.browser.gecko) 
				return s;
			
	        return s.replace(/href=["']wygify:\/\/wygify\/([^"']*)["']/g, 'href="$1"');
	    },
		
		/**
		 * Destroys the editor html and reinstates the textarea
		 */
		destroy: function() {
			this.$wyg.remove();
			
			if (this.options.clearTextareaOnDestroy)
				this.$textarea.val('');
			
			this.$textarea.show();
		}
	};
	
	/**
	 * Checks if the supplied element already has a wygify associated with it
	 * 
	 * @param DOMElement	textarea
	 * 
	 * @return mixed		false / editor object
	 */
	function checkIfEditorExists(textarea) {
		var ret = false;
		
		$.each(editors, function(ind, el) {
			if (el.$textarea[0] == textarea) {
				ret = el;
				return true;
			}
		});
		
		return ret;
	}
	
	/**
	 * Removes an editor from the editors list
	 
	 * @param DOMElement	textarea
	 */
	function removeEditor(textarea) {
		var ind = false;
		
		$.each(editors, function(index, el) {
			if (this.$textarea[0] == textarea) {
				ind = index;
				return false;
			}
		});
		
		if (ind !== false)
			editors.splice(ind, 1);
	}
	
	/**
	 * Establishes the wygify on a textarea
	 * 
	 * @param Object	options
	 */
	$.fn.wygify = function(options) {
		return this.each(function() {
			var $this = $(this);
			
			if ($this.is('textarea')) {
				if (!checkIfEditorExists(this)) 
					editors.push(new editor($this, options));
			}
		});
	};
	
	/**
	 * This method returns the contents of the WYSIWYG elements
	 * 
	 * @return mixed	String / array of strings
	 */
	$.fn.getWygifyContents = function() {
		var vals = [];
		
		this.each(function() {
			var editor = checkIfEditorExists(this);
			
			if (editor)
				vals.push(editor.getContent());
			else
				vals.push(false);
		});
		
		if (vals.length === 1)
			return vals[0];
		else
			return vals;
	};
	
	/**
	 * This method clears the contents of the WYSIWYG elements
	 * 
	 * @return jQueryObject
	 */
	$.fn.clearWygifyContents = function() {
		return this.each(function() {
			var editor = checkIfEditorExists(this);
			
			if (editor)
				editor.clearContents();
		});
	};
	
	/**
	 * This method destroys the WYSIWYG element and returns the textarea to its original state
	 * 
	 * @return jQueryObject
	 */
	$.fn.destroyWygify = function() {
		return this.each(function() {
			var editor = checkIfEditorExists(this);
			
			if (editor)
				editor.destroy();
			
			removeEditor(this);
		});
	};
})(jQuery);