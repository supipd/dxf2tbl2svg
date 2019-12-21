///<file name="dxf2tbl2svg_UI.js" path="/.../dxf2tbl2svg_UI.js" type="javascript">

///<section name="FileReader">
/// using FileReader API for local file upload
/// (for test page purposes)
localFileReader = {
	reader : null
,	progress : null
,	init : function() {
		this.progress = document.querySelector('#progress_bar .percent');
		document.getElementById('DXFfileName').addEventListener('change', function(evt) {
			localFileReader.handleFileSelect(evt);
		}, false);
	}
,	abortRead : function () {
		this.reader.abort();
	}
,	errorHandler : function (evt) {
		switch(evt.target.error.code) {
			case evt.target.error.NOT_FOUND_ERR:
				alert('File Not Found!');
				break;
			case evt.target.error.NOT_READABLE_ERR:
				alert('File is not readable');
				break;
			case evt.target.error.ABORT_ERR:
				break; // noop
			default:
				alert('An error occurred reading this file.');
		};
	}
,	updateProgress : function (evt) {	// evt is an ProgressEvent.
		if (evt.lengthComputable) {
			var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
			// Increase the progress bar length.
			if (percentLoaded < 100) {
				this.progress.style.width = percentLoaded + '%';
				this.progress.textContent = percentLoaded + '%';
			}
		}
	}
,	handleFileSelect : function (evt) {
		var me = this;
	// Reset progress indicator on new file selection.
		this.progress.style.width = '0%';
		this.progress.textContent = '0%';

		this.reader = new FileReader();
		this.reader.onerror = function(evt) {
			me.errorHandler(evt);
		}
		this.reader.onprogress = function(evt) {
			me.updateProgress(evt);
		}
		this.reader.onabort = function(e) {
			alert('File read cancelled');
		};
		this.reader.onloadstart = function(e) {
			document.getElementById('progress_bar').className = 'loading';
		};
		this.reader.onload = function(e) {
			// Ensure that the progress bar displays 100% at the end.
			me.progress.style.width = '100%';
			me.progress.textContent = '100%';
			setTimeout( function() {
				document.getElementById('progress_bar').className='';
			}, 2000);
			(Active_DXF2TBL || DXF2TBL()).make( e.target.result)
		}
		if (evt.target.files.length) {
			// Read in the image file as a text.
			this.reader.readAsText(evt.target.files[0]);
		}
	}
}
///</section>


///<section name="UI">
/// UI functionality strictly dependant on LIBRARY not explicitly needed 
///	for TARGET DXF 2 TBL 2 SVG conversion
/// only for presentation pages with specific XHTML structure
///<dependancies>
///	loadman([
///		'/LIBRARY/UI/UI_forms.css'
///	,	'/LIBRARY/UI/UI_forms.js'
///	,	'/LIBRARY/GETSET/getset.js'
///	,	'/LIBRARY/TIMING/timeManager.js'
///	,	"/LIBRARY/MODULES/BUTTON/onoffbutton.js"
///	,	"/hbp/MAPS/Zahorie/dxf2tbl.js"
///	,	'/LIBRARY/SVGDOM/SVGpzr.js'
///	,	'/UTILITY/JSONeditor/JSONeditor.xhtc'
///	]);
///</dependancies>

function print_section( tuplelist, idt, start, count ) {
	idt = idt || 'Dt_1';
	var elDiv = gID('div#'+idt)	//gID('div.DXFtable')
	,	ih = ""
	,	le = tuplelist && tuplelist.length || 0
	;
	start = parseFloat(start) || 0;
	count = parseFloat(count) || le - start;
	for(var i = start; i < Math.min(le, start+count); i++) {
		var txt = isDef(tuplelist[i].gcode) 
			? '<span>'+tuplelist[i].gcode+'</span><span>'+encodeXml(tuplelist[i].value)+'</span>'
			: '<span>'+tuplelist[i]._name_+'</span><span class="t"><div><![CDATA['
				+ JSON.stringify(tuplelist[i]) +']]></div></span>'
		;
		ih += '<div><b>'+i+'</b>'+ txt +'</div>';
	}
	if (elDiv) {
		elDiv.innerHTML = ih;
	}
	return ih;
}
function gen_DXF_selektors( svg, force ) {
	var tb = svg.rgID('table tbody')
	if (!force && tb && tb.childElementCount >1 ) {
		return;
	}
	var gids = svg.queryXpath('./s:g[@id="dxf2svg"]/s:g[starts-with(@id,"lg_")]')
	,	sel = svg.rgID('div#selektor_DXF select')
	,	tblb = svg.rgID('div#selektor_DXF table tbody')
	,	templ = tblb && tblb.firstElementChild
	;
	if (!gids) {
		return;
	}
	if (sel) {
		sel.innerHTML = '';
		for (var i=0; i<gids.length; i++) {
			var opt = new Option( gids[i].id );
			sel.options.add(opt);
		}
	}
	if (tblb) {
		tblb.innerHTML = '';
		tblb.appendChild(templ);
		for (var i=0; i<gids.length; i++) {
			var tr = templ.cloneNode(true);
			tr.querySelector('span.label').textContent = gids[i].id;
			tr.querySelector('span.description').textContent = gids[i].getAttribute('inkscape:label');
			tblb.appendChild(tr);
		}
	}
}
function handle_DXF_gid (evt) {
	var chck = evt.target;
	if (chck.type=='checkbox') {
		var c = chck.checked
		,	tr = chck.parentNode
		,	tbody = tr.parentNode
		,	svg = chck.rtgID('svg')
		;
		if (tr === tbody.firstElementChild) {	//(id=='Vsetko')
			var chks = tbody.querySelectorAll('input[type=checkbox]');
		} else {
			chks = [chck];
		}
		for (var i=0; i<chks.length; i++) {
			var	id = chks[i].nextElementSibling.textContent
			,	g = svg.querySelector('g[id="'+id+'"]')
			;
			chks[i].checked = c;
			if (g) {
				g.style.display = c ? '' : 'none';
			}
		}
	}
}
function handle_DXF_layer( evt, what ) {
	var el = (evt instanceof Event) ? evt.target : evt
	,	nm = el && el.nodeName.toLowerCase()
	,	svg = el.rtgID('svg')
	;
	if (! svg) {
		return;
	}
	switch(what) {
		case 'gen':
			var	le = el.parentNode.querySelector('span.label')
			,	de = el.parentNode.querySelector('span.description')
			,	chck = el.parentNode.querySelector('input[type=checkbox]')
			;
			if (chck && chck.checked && (nm == 'span') && le && de) {
				var id = le.textContent
				,	div = el.rtgID('#selektor_DXF_layer')
				,	txts = svg.querySelectorAll('g[id="'+id+'"] text')
				;
				for(var i=0, ih=''; i<txts.length; i++) {
					ih+='<li><span>'+txts[i].textContent+'</span></li>'
				}
				if (div) {
					div.querySelector('h4 span.label').textContent = id;
					div.querySelector('h4 span.description').textContent = de.textContent;
					div.querySelector('ul').innerHTML = ih;
					div.style.display = '';
				}
			}
			break;
		case 'sel':
			var txt = el.textContent
			,	le = el.rgID('span.label')
			,	de = el.rgID('span.description')
			,	sel = svg.queryXpath(".//s:g[@id='"+le.textContent+"']//s:text[.='"+txt+"']",__,1)
			;
			if (sel) {
				SVGpzr(sel).el_centerAt(sel);
			}
			break;
	}
}
function handle_DXFtable(evt) {
	var el = (evt instanceof Event) ? evt.target : evt
	,	jE = gID('#JSONeditor_div')
	;
	if (el.firstChild.nodeType == Node.CDATA_SECTION_NODE) {
		if (jE) {
			JSONeditor.binder.load(el.firstChild.textContent);
			UI.Layout.moveToFront(jE);
		}
	}
}
function handle_SVG_info (frm) {
	frm = frm || gID('form#svg_info_form');
	var findSections = document.forms.findSections
	,	findEntities = document.forms.findEntities
	,	findBlocks = document.forms.findBlocks
	,	frme = frm.elements
	,	idm = /^_(.*)/.exec(frme.evTargetId.value)
	,	data = JSON5.parseOr(frme.evTargetData.value, null)
	;
	if (idm) {
		findSections.elements.sect_name.value = 'ENTITIES';
		findSections.elements.findcode.value = 5;
		findSections.elements.findvalue.value = idm[1];
		aFireEvent(findSections.elements.doFind,'click');
		if (! data.inserter) {
			findEntities.elements.findcode.value = 5;
			findEntities.elements.findvalue.value = idm[1];
			aFireEvent(findEntities.elements.doFind,'click');
		} else {
			idm = /^_(.*)/.exec(data.inserter);
			if (idm) {
				findEntities.elements.findcode.value = 5;
				findEntities.elements.findvalue.value = idm[1];
				aFireEvent(findEntities.elements.doFind,'click');
				var inserterObj = a_ENTITIES.find(function(v){
						return v['5']==idm[1];
					})
				,	blockName = inserterObj && inserterObj.AcDbBlockReference['2']
				;
				if (blockName) {
					findBlocks.elements.arr_name.value = 'a_BLOCKS';
					findBlocks.elements.findcode.value = 2;
					findBlocks.elements.findvalue.value = blockName;
					aFireEvent(findBlocks.elements.doFind,'click');
				}
			}
		}
	}
}

///</section>

///<section name="instancionalizm">
Active_DXF2TBL = DXF2TBL();
Active_DXFdrawerSVG = DXFdrawerSVG(Active_DXF2TBL);
///</section>


///</file>