///<file name="dxf2tbl2svg.js" path="/.../dxf2tbl2svg.js" type="javascript">

///<section name="auxiliary globals">
///<variable name="DEBUG_LINE_NR"> helper DEBUG constant </variable>
DEBUG_LINE_NR = 10000000;
///<variable name="svgNS"> well known value </variable>
var svgNS = "http://www.w3.org/2000/svg";
///<variable name="Active_DXF2TBL"> last created instance of class DXF2TBL </variable>
Active_DXF2TBL = null;
///<variable name="Active_DXFdrawerSVG"> last created instance of class DXFdrawerSVG </variable>
Active_DXFdrawerSVG = null;
///</section>

///<section name="aliasLIBRARY" desc="LIBRARY fake aliases for autonomous functionality">
if (typeof isDef == 'undefined') {
	__ = undefined;
	function getType(thing){
		if(thing===null)return "[object Null]"; // special case
		return Object.prototype.toString.call(thing);
	}
	isDef = function(thing) { return (thing !== undefined); }
	isArr = function(thing) { return Array.isArray ? Array.isArray(thing) : getType(thing) == "[object Array]"; }
}
if (typeof gID == 'undefined') {
	gID = function( query ) {
		return document.querySelector(query);
	}
	Node.prototype.rgID = function (query) {
		return gID(query);
	}
	Node.prototype.rtgID = function (query) {
		return gID(query);
	}	
}
if (typeof gopn == 'undefined') {
	function gopn(o, pre, r) {
	  var a,c;
	  r  = r || [];
	  if ((typeof o) != "string") {
		  try {
		   a = Object.getOwnPropertyNames(o);
		  } catch(e) {}
	  }
	  if (a) {
		for (var i=0; i<a.length; i++) {
			c=[];
			if ((typeof o[a[i]]) != "string") {
				try {
					c = Object.getOwnPropertyNames(o[a[i]]);
				} catch(e){}
			}
		  if (!c.length) {	// neukladame mena objektov
			  r.push(pre+(pre?".":"")+a[i]);
		  }
		  r = gopn(o[a[i]], pre+(pre?".":"")+a[i], r);
		}
	  }
	  return r;
	}
}
///</section>

///<section name="TARGET" desc="LIBRARY independant target functionality">

///<class name="DXF2TBL">

///<function name="DXF2TBL" type="constructor">
///<param name="dxftxt" type="String" optional="optional"> AutoCAD DXF text </param>
///<desc> DXF2TBL class je priamo (bez new) volatelna komponenta
/// vykonavajuca citanie, rozbor a konverziu DXF textoveho suboru do tabuliek
///</desc>
///<call>DXF2TBL.prototype.init</call>
DXF2TBL = function( dxftxt ) {
	if (!(this instanceof DXF2TBL)) {
		return new DXF2TBL( dxftxt );
	}
	this.dxftxt = dxftxt || '';
	Active_DXF2TBL = this;
	return this.init();
}
///</function>

///<instance name="DXF2TBL">
///<property name="dxftxt" type="String">actual AutoCAD DXF text </property>

///<property name="sections" type="Object"> DXF main sections as arrays of tuples </property>

///<property name="a_HEADER" type="Array"> array of HEADER section objects </property>
///<property name="a_CLASSES" type="Array"> array of CLASSES section objects </property>
///<property name="a_TABLES" type="Array"> array of TABLES section objects </property>
///<property name="a_BLOCKS" type="Array"> array of BLOCKS section objects </property>
///<property name="a_ENTITIES" type="Array"> array of ENTITIES section objects </property>
///<property name="a_OBJECTS" type="Array"> array of OBJECTS section objects </property>
///<property name="a_THUMBNAILIMAGE" type="Array"> array of THUMBNAILIMAGE section objects </property>
///</instance>

///<prototype name="DXF2TBL">
DXF2TBL.prototype = {
	init : function() {
		this.sections = {};
	
		this.a_HEADER = [];
		this.a_CLASSES = [];
		this.a_TABLES = [];
		this.a_BLOCKS = [];
		this.a_ENTITIES = [];
		this.a_OBJECTS = [];
		this.a_THUMBNAILIMAGE = [];		
		return this;
	}
	
,	loadDXFfile : function( filepath, callback, svg_callback ) {
		var me = this
		,	cfg = me.cfg
		,	callback = callback || function( resp ) {
				me.make(resp,__,svg_callback);
			}
		;
		if (! filepath) {	// use FileReader API to read local file
		} else {	// use loadman or XHR to load server side stored file
			if (typeof loadman != 'undefined') {
				loadman(filepath, {
						method: 'POST'
					,    respXML : false
					,    callback : function( el, resp ) {
							callback(resp,svg_callback);
						 }
					,    forceUserCallback : true
					,    waiting : -1
				});
			} else {
				var xmlhttp	= new XMLHttpRequest();
				xmlhttp.onreadystatechange=function()	{
					if (xmlhttp.readyState==4 )		{
						callback(xmlhttp.responseText,svg_callback);
					}	
				};
				xmlhttp.open('POST', filepath, true);
				xmlhttp.send();
			}
		}
	}

,	dxf_get_sections : function ( dxftxt ) {
		dxftxt = dxftxt || this.dxftxt;
		var lines = dxftxt.split("\n")
		,	cnt=0
//		,	progres_ENT = gID('input#progres_ENT')
		,	a_section = ""
		;
		for(var i=0; i < lines.length; i+=2) {
			if (!lines[i]) {
	console.log('empty row nr.'+i);
				break;
			}
//			if ( (++cnt % 100) == 0 ) {
//				progres_ENT.value = cnt;	//console.log(cnt);
//			}
			var	tuple = { gcode: parseInt(lines[i], 10), value: lines[i+1]/*.trim()*/.replace(/[\r\n]*/g,'') };
			if ((tuple.gcode == 0) && (tuple.value.trim() == 'SECTION')) {
				i+=2;
				tuple = { group_code: parseInt(lines[i], 10), section_name: lines[i+1].trim() };
				this.sections[ a_section = tuple.section_name ] = {offset:i/2, list:[]};
			} else {
				this.sections[ a_section ].list.push( tuple );
			}
		}
		lines = [];	// not needed more
		return this.sections;
	}

,	add_obj : function ( obj, name, val) {
		if (!isDef(obj[name])) {
			obj[name] = val;
			return obj[name];	// vrat novy objekt samotny
		} else {
			if (!isArr(obj[name])) {
				obj[name] = [obj[name]];
			}
			obj[name].push(val);
			return obj[name][obj[name].length-1];	// vrat posledne pridany prvok pola
		}
	}
,	separate_arrays : function ( section, outer, splitCodes ) {
		splitCodes = splitCodes || [0];
		var section_list = section.list
		,	section_offset = section.offset
		,	objekt, primar
		;
		for(var i=0; i< section_list.length; i++) {	
			var gv = section_list[i];
if (i >= DEBUG_LINE_NR) {
	debugger;	
}
			if ( splitCodes.indexOf(gv.gcode) == -1 ) {
				this.add_obj( objekt, gv.gcode, gv.value );
			} else {
				if (gv.gcode == 0) {
					if (primar) {
						outer.push(primar);
					}
					objekt = primar = { _name_: gv.value, _line_: section_offset + i, _idx_: i };
				} else {
					if (gv.gcode == 100) {
						objekt = primar;
					}
					objekt = this.add_obj( objekt, gv.value, {} );
				}
			}
		}	
		return outer;
	}
,	separall_arrays : function () {
		this.a_BLOCKS	= [];	this.separate_arrays(this.sections.BLOCKS, this.a_BLOCKS,[0,100]);
		this.a_ENTITIES	= [];	this.separate_arrays(this.sections.ENTITIES, this.a_ENTITIES,[0,100]);
	}

,	find_handle_in_array : function ( section, id, tag, item_name, last_idx ) {
		tag = tag || '5';	// default id
		last_idx = parseInt(last_idx);
		last_idx = isNaN(last_idx) ? -1 : Math.max(last_idx,-1);
		var i,j, obj, keys
		,	checker = new RegExp("^_(\\.([\\w\\d_]+))?\."+tag+"$","i")
		,	matches
		;
		for(i=last_idx+1; i < section.length; i++) {
			obj = section[i];
			if (item_name && (obj._name_ != item_name)) {
				continue;
			}
			keys = gopn(obj,'_');
			for(j=0;j<keys.length;j++) {
				//if (isDef(obj[tag]) && (obj[tag]==id) ) {
				matches = checker.exec(keys[j]);
				if ( matches && ((matches[2] ? obj[matches[2]][tag] : obj[tag]) == id) ) {
					return {
						index: i
					,	section: section
					,	object: obj
					};
				}
			}
		}
	}

,	make :  function( dxftxt, drawer, svg_callback ) {
		var me = this
		,	pxt = gID('pending_xslt_trafo')
		;
		if (pxt) { pxt.style.display=''; }
		setTimeout(function() {	// to update DOM
			drawer = drawer || Active_DXFdrawerSVG || DXFdrawerSVG(me);
			me.drawer = drawer;
			me.dxftxt = dxftxt || me.dxftxt;
			me.dxf_get_sections();    // read and parse DXF
			me.separall_arrays();            // prepare analytics of DXF entities

			var svgG = drawer.prepare_svg();
			return drawer.draw_entities( svgG, __, __, function() {    // draw SVG, and then call user callback
				if (pxt) { pxt.style.display='none'; }
				if (typeof svg_callback == 'function') {
					svg_callback( svgG );
				}
			});  
		},1);
	}
}

///</class> <!--  name="DXF2TBL" -->

///<class name="DXFdrawerSVG">

///<function name="DXFdrawerSVG" type="constructor">
///<param name="inst_DXF2TBL" type="CLASS" > instance of DXF2TBL class</param>
///<param name="cfg" type="Object" optional="optional"> configuration object 
///	<item name="svgG" type="SVGGElement" optional="optional"> generated SVG holder </item>
///	<item name="clip_min_x" type="Number"> DXF geometry clipping </item>
///	<item name="clip_max_x" type="Number"> DXF geometry clipping </item>
///	<item name="clip_min_y" type="Number"> DXF geometry clipping </item>
///	<item name="clip_min_y" type="Number"> DXF geometry clipping </item>
///	<item name="clip_min_z" type="Number"> DXF geometry clipping </item>
///	<item name="clip_min_z" type="Number"> DXF geometry clipping </item>
///	<item name="DECS_M" type="Number"> rounding decimals divider </item>
///</param>
///<desc> DXFdrawerSVG class je priamo (bez new) volatelna komponenta
/// vykonavajuca konverziu vysledkov DXF analyzy do SVG grafickeho formatu
///</desc>
///<call>DXF2TBL.prototype.init</call>
DXFdrawerSVG = function( inst_DXF2TBL, cfg ) {
	if (!(this instanceof DXFdrawerSVG)) {
		return new DXFdrawerSVG( inst_DXF2TBL, cfg );
	}
	this.inst_DXF2TBL = inst_DXF2TBL;
	this.cfg = cfg || this.default_cfg;
	this.init();
	Active_DXFdrawerSVG = this;
	return this;
}
///</function>

///<instance name="DXF2TBL">
///<property name="inst_DXF2TBL" type="CLASS" > instance of DXF2TBL class</param>
///<property name="cfg" type="Object">actual configuation </property>

///<property name="layer_groups" type="Object"> layers descriptions </property>
///<property name="inserter_def" type="Object"> actual INSERT state </property>
///<property name="missing" type="Array"> list of unknown entity drawers </property>

///<property name="svg_min_x" type="Number"> SVG dimensioning </property>
///<property name="svg_max_x" type="Number"> SVG dimensioning </property>
///<property name="svg_min_y" type="Number"> SVG dimensioning </property>
///<property name="svg_max_y" type="Number"> SVG dimensioning </property>

///</instance>

///<prototype name="DXF2TBL">
DXFdrawerSVG.prototype = {
	default_cfg : {
		svgG_gID : 'g#dxf2svg'
	,	svgG : null
		
	,	clip_min_x : 0	//-572500.0
	,	clip_max_x : 100000000.0	//-562500.0
	,	clip_min_y : 0	//-1225000.0
	,	clip_max_y : 100000000.0	//-1217000.0
	,	clip_min_z : 0
	,	clip_max_z : 100000000.0	
	
	,	DECS_M : 1000
	}
,	init : function() {
		this.layer_groups = {};
		this.inserter_def = null;
		this.missing = [];
		
		this.svg_min_x = 100000000.0;
		this.svg_max_x = -100000000.0;
		this.svg_min_y = 100000000.0;
		this.svg_max_y = -100000000.0;
	}
,	set_cfg : function( cfgORform ) {
		var cfg = this.default_cfg
		,	keys = Object.keys(cfg);
		;
		if (cfgORform instanceof HTMLFormElement) {
			var frme = cfgORform.elements;
			keys.forEach( function(v) {
				if (isDef(frme[v])) {
					cfg[v] = (frme[v].type=='number') 
						? parseFloat(frme[v].value) 
						: frme[v].value
					;
				}
			})
		} else {
			keys.forEach( function(v) {
				if (isDef(cfgORform[v])) {
					cfg[v] = cfgORform[v];
				}
			})
		}
		return( this.cfg = cfg );
	}
,	log_missing : function ( section_mark, idx, ent_name ) {
				// save in format printable by print_section(drawer.missing)
		this.missing.push({	gcode:idx, value: section_mark+': '+ ent_name	});
		console.log('Missing ['+ent_name+']'+' at '+section_mark+' index : '+idx );
		var konzola = gID('#konzola');
		if (konzola) {
			konzola.innerHTML ='<div><span>'+section_mark
				+'</span><span>'+' index : '+idx
				+'</span><span>'+'Missing ['+ent_name+']'+'</span></div>'
				+ konzola.innerHTML
			;
			if (konzola.children.length > 50) {
				konzola.removeChild(konzola.firstElementChild);
			}
		}
	}
	
,	rounder : function ( num, chck ) {
		var val = isNaN(num) ? num : Math.round( num * this.cfg.DECS_M ) / this.cfg.DECS_M; 
		switch(chck) {
			case 'x' : 
				this.svg_min_x = Math.min(this.svg_min_x, val);
				this.svg_max_x = Math.max(this.svg_max_x, val);
				break;
			case 'y' : 
				this.svg_min_y = Math.min(this.svg_min_y, val);
				this.svg_max_y = Math.max(this.svg_max_y, val);
				break;
		}
		return val;
	}
,	ensureArr : function (a) {
		return isArr(a) ? a : [a];
	}
//	structureENT(ent,[{n:'AcDbEntity',t:[8]},{n:'AcDbLine',t:[19,11,20,21]}])
,	structureENT : function(ent, desc) {	// [{n:name, t:[tags]}, ..., {n:name, t:[tags]}]
		desc.forEach( function(v) {
			var name = v.n
			,	tags = v.t
			;
			if (! ent[name]) {
				ent[name] = {};
				tags.forEach( function(t) {
					ent[name][t] = ent[t];
					delete ent[t];
				});
			}
		});
		return ent;
	}
	
,	layer : function(layer, parent) {
		var lg = this.layer_groups
		,	le = Object.keys(lg).length
		;
parent = this.holder;		
		if (!isDef(lg[layer])) {
			var src = '<g id="lg_'+le+'" inkscape:label="'+layer+'" inkscape:groupmode="layer">';
			lg[layer]={ id:'lg_'+le, src :[src], g:null };
			if (parent) {
				var s = parent.ownerDocument.createElementNS(svgNS,'g');
				s.setAttribute('id','lg_'+le);
				s.setAttribute('inkscape:label',layer);
				s.setAttribute('inkscape:groupmode',"layer");
				lg[layer].g = s;
				parent.appendChild(s);
			}
		}
		return lg[layer];
	}
,	sourcer : function() {	
		var src = ''
		,	lg = this.layer_groups
		;
		Object.keys(lg).forEach( function(v) {
			var g = lg[v];
			if (g.src[g.src.length-1] != '</g>') {
				g.src.push('</g>');
			}
			src+= g.src.join("\n");
		});
		return src;
	}
,	POINT : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbPoint', t:[10,20] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbPoint['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	cy = this.rounder( - ( parseFloat(ent.AcDbPoint['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	r = 0.1
		,	src = '<circle id="'+ iid +'" class="pen1 l_'+layid+'" cx="'+cx+'" cy="'+cy+'" r="'+r+'"'
				+' data-drawer="POINT"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'/>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'circle');
			s.setAttribute('data-drawer','POINT');
			s.setAttribute('cx',cx);
			s.setAttribute('cy',cy);
			s.setAttribute('r',r);
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
,	CIRCLE : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbCircle', t:[10,20,40] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbCircle['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	cy = this.rounder( - ( parseFloat(ent.AcDbCircle['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
// 50	start angle		
// 51	end angle		
		,	r = this.rounder( parseFloat(ent.AcDbCircle['40']) )
		,	src = '<circle id="'+ iid +'" class="pen1 l_'+layid+'" cx="'+cx+'" cy="'+cy+'" r="'+r+'"'
				+' data-drawer="CIRCLE"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'/>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'circle');
			s.setAttribute('data-drawer','CIRCLE');
			s.setAttribute('cx',cx);
			s.setAttribute('cy',cy);
			s.setAttribute('r',r);
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
//	,	ELLIPSE :	TODO
,	LINE : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbLine', t:[10,11,20,21] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	x1 = this.rounder( parseFloat(ent.AcDbLine['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	x2 = this.rounder( parseFloat(ent.AcDbLine['11']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y1 = this.rounder( - ( parseFloat(ent.AcDbLine['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	y2 = this.rounder( - ( parseFloat(ent.AcDbLine['21']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	src = '<line id="'+ iid +'" class="pen1 l_'+layid+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"'
				+' data-drawer="LINE"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'/>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'line');
			s.setAttribute('data-drawer','LINE');
			s.setAttribute('x1',x1);
			s.setAttribute('x2',x2);
			s.setAttribute('y1',y1);
			s.setAttribute('y2',y2);
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
,	POLYLINE : function(ent, parent, referer) {	//TODO from subsequent VERTEX-es
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDb2dPolyline', t:[10,20,30] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + "pl_"+id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	pline_flag = ent.AcDb2dPolyline['70']
		,		closed = pline_flag && (pline_flag & 1)
		,		Plinegen = pline_flag && (pline_flag & 128)
		,	gpar = lg && lg.g || parent
		;
		this.polyline_def = {
			id : iid
		,	pline_flag : pline_flag
		,	closed : closed
		,	Plinegen : Plinegen
		,	x : this.rounder( parseFloat(ent.AcDb2dPolyline['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y : this.rounder( - ( parseFloat(ent.AcDb2dPolyline['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
	//	,	z : this.rounder( - ( parseFloat(ent.AcDb2dPolyline['30']) +(this.inserter_def ? this.inserter_def.z :0) - (referer ? 0 : this.cfg.clip_min_z) ) )
		,	referer : referer
		,	layer : layer
		,	layid : layid
		,	lg : lg
		,	gpar : gpar
		,	vertexes : []
		};
		return '';
	}
,	VERTEX : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDb2dVertex', t:[10,20,42] }
		]);
		var id = '_'+ent.AcDbEntity['5']
		,	iid = (this.polyline_def ? this.polyline_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	x = this.rounder( parseFloat(ent.AcDb2dVertex['10']) +(this.polyline_def ? this.polyline_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y = this.rounder( - ( parseFloat(ent.AcDb2dVertex['20']) +(this.polyline_def ? this.polyline_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	bulgeA = parseFloat(ent.AcDb2dVertex['42'])
		,	bulge = isNaN(bulgeA) ? 0 : bulgeA
		;
		this.polyline_def.vertexes.push({
			x: x
		,	y: y
		,	bulge: bulge
		});
		return '';
	}
//	http://www.lee-mac.com/bulgeconversion.html
,	_bulgeToArc : function(vrtx1, vrtx2) {
		var p1 = { x:vrtx1.x, y:vrtx1.y }
		,	p2 = { x:vrtx2.x, y:vrtx2.y }
		,	bulge = vrtx1.bulge
		;
/*
;; Bulge to Arc  -  Lee Mac
;; p1 - start vertex
;; p2 - end vertex
;; b  - bulge
;; Returns: (<center> <start angle> <end angle> <radius>)

(defun LM:Bulge->Arc ( p1 p2 b / a c r )
    (setq a (* 2 (atan b))
          r (/ (distance p1 p2) 2 (sin a))
          c (polar p1 (+ (- (/ pi 2) a) (angle p1 p2)) r)
    )
    (if (minusp b)
        (list c (angle c p2) (angle c p1) (abs r))
        (list c (angle c p1) (angle c p2) (abs r))
    )
)
*/
/*		bulge = b = tan( FI / 4 )
		angle = FI = 4 * arctan( b )
				d = r * sin( FI / 2 )
		radius = r = d / sin( FI / 2 )
*/
		var angle = 4 * Math.atan(bulge)
		,	d = Math.sqrt( (p2.x - p1.x)*(p2.x - p1.x) + (p2.y - p1.y)*(p2.y - p1.y) )
		,	r = d / 2 / Math.sin( angle / 2 )
		;
		return 'A '+r+','+r+' 0, 0,0, '+vrtx2.x+','+vrtx2.y;
	}
,	_polyline_gen : function( def ) {
		def = def || this.polyline_def;
		var d="";
		if (def.closed) {
			def.vertexes.push(def.vertexes[0]);
		}
		for (var i=0; i<def.vertexes.length - 1; i++) {
			var vrtx1 = def.vertexes[i]
			,	vrtx2 = def.vertexes[i+1]
			;
			if (i==0) {
				d+="M "+vrtx1.x+','+vrtx1.y;
			}
			if (vrtx1.bulge) {
				d+= this._bulgeToArc(vrtx1, vrtx2);
			} else {
				d+= (i>0) ? ' L '+vrtx2.x+','+vrtx2.y : '';
			}
		}
		var	src = '<path id="'+ def.id +'" class="pen1 l_'+def.layid+'" d="'+ d +'"'
				+' data-drawer="POLYLINE"'
				+(def.referer ? ' data_referer="'+def.referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'/>'
		;
		if (def.lg) {
			this.layer_groups[def.layer].src.push(src);
		}
		if (def.gpar) {
			var s = def.gpar.ownerDocument.createElementNS(svgNS,'path');
			s.setAttribute('data-drawer','POLYLINE');
			s.setAttribute('d',d);
			s.setAttribute('class',"pen1 l_"+def.layid);
			s.setAttribute('id',def.id);
			if (def.referer) {
				s.setAttribute('data-referef',def.referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			def.gpar.appendChild(s);
		}
		return src;
	}
,	LWPOLYLINE : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbPolyline', t:[10,20,70,43,40,41,75,90] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	pline_flag = ent.AcDbPolyline['70']
		,		closed = pline_flag && (pline_flag & 1)
		,		Plinegen = pline_flag && (pline_flag & 128)
		,	constant_width = ent.AcDbPolyline['43']
		,	start_width = ent.AcDbPolyline['40']
		,	end_width = ent.AcDbPolyline['41']
		,	curves_flag = ent.AcDbPolyline['75']
		,	num_vertices = parseFloat(ent.AcDbPolyline['90'])
		,	me = this
		,	gen_path = function() { 
				var d="", x,y;
				for(var i=0; i<num_vertices; i++) {
					x = me.rounder( parseFloat(ent.AcDbPolyline['10'][i]) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x');
					y = me.rounder( - ( parseFloat(ent.AcDbPolyline['20'][i]) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y');
					d+= (i?'L ':'M ')+x+' '+y+' ';
				}
				return d;
			}
		,	d = gen_path()
		,	src = '<path id="'+ iid +'" class="pen1 l_'+layid+'" d="'+ d +'"'
				+' data-drawer="LWPOLYLINE"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'/>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'path');
			s.setAttribute('data-drawer','LWPOLYLINE');
			s.setAttribute('d',d);
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
//	,	TRACE :	TODO 4-point polygon
,	ARC : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbCircle', t:[10,20,40] }
		,	{ n:'AcDbArc', t:[50,51] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbCircle['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) )
		,	cy = this.rounder( - ( parseFloat(ent.AcDbCircle['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) )
		,	r = this.rounder( parseFloat(ent.AcDbCircle['40']) )
		,	dsa = parseFloat(ent.AcDbArc['50'])
		,	start_angle = (360 - dsa) % 360
		,	dea = parseFloat(ent.AcDbArc['51'])
		,	end_angle = (360 - dea) % 360
		,	me = this
		,	gen_path = function() {
				var start_point = {
						x: me.rounder(cx + r * Math.cos(start_angle * Math.PI/180), 'x')
					,	y: me.rounder(cy + r * Math.sin(start_angle * Math.PI/180), 'y')
					}
				,	end_point = {
						x: me.rounder(cx + r * Math.cos(end_angle * Math.PI/180), 'x')
					,	y: me.rounder(cy + r * Math.sin(end_angle * Math.PI/180), 'y')
					}
				;
				return 'M '+ start_point.x +' '+ start_point.y
					+ ' A '+r+','+r+' 0'	// For arc assume no x-axis rotation. 
			//		+ ( ( (end_angle > start_angle) && (end_angle - start_angle > 180) )
			//			? ' 1,0' : ' 0,0' )
					+ ( (dea > dsa) ? ' 1,0' : ' 0,0' )
					+ ' '+ end_point.x +','+ end_point.y
				;
			}
		,	d = gen_path()
		,	src = '<path id="'+ iid +'" class="pen1 l_'+layid+'" d="'+ d +'"'
				+' data-drawer="ARC"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? 
					' data-inserter="'+this.inserter_def.id+'" transform="'+this.inserter_def.trans+'"' 
				: '')
				+'/>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'path');
			s.setAttribute('data-drawer','ARC');
			s.setAttribute('d',d);
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
//,	SPLINE : TODO 
,	SOLID : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbTrace', t:[10,11,12,13,20,21,22,23] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	num_vertices = isDef(ent.AcDbTrace['13']) ? 4 : 3
		,	me = this
		,	gen_path = function() { 
				var d="", x,y;
				for(var i=0; i<num_vertices; i++) {
					x = me.rounder( parseFloat(ent.AcDbTrace['1'+i]) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x');
					y = me.rounder( - ( parseFloat(ent.AcDbTrace['2'+i]) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y');
					d+= (i?'L ':'M ')+x+' '+y+' ';
				}
				return d+' Z';
			}
		,	d = gen_path()
		,	src = '<path id="'+ iid +'" class="pen1 l_'+layid+'" d="'+ d +'" fill="url(#solidFill)"'
				+' data-drawer="SOLID"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'/>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'path');
			s.setAttribute('data-drawer','SOLID');
			s.setAttribute('d',d);
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			s.setAttribute('fill',"url(#solidFill)");
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
,	HATCH : function(ent, parent, referer) {	// provisorium only line edges !
//	https://www.autodesk.com/techpubs/autocad/acad2000/dxf/boundary_path_data_dxf_06.htm
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbHatch', t:[10,11,20,21,70,72,91,92,93] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	solid_fill_flag = ent.AcDbHatch['70']
		,	num_boundaries_loops = parseFloat(ent.AcDbHatch['91'])
		,	a_boundaries_type = this.ensureArr(ent.AcDbHatch['92'])
		,	a_boundaries_edges = this.ensureArr(ent.AcDbHatch['93'])
		,	a_edges_type = this.ensureArr(ent.AcDbHatch['72'])
		,	me = this
// err: handles
//	1A2F5	"1A911"	"2289F"	"23A56"	"2561B"	"25A9B"	... edges = 1
//	_3F081 _3F17A _40456C8 _4044DAA
		
		,	gen_path_loops = function() { 
				var d="", dd=""	//, bulge
				,	x,y,iXY = 0+1		// 10.20 index	(prvy '10' bod je elevation point)
				,	x2,y2,iXY2 = 0		// 11.21 index
				,	i72 = 0				// 72 index (edge type)
				;
				for(var j=0; j < num_boundaries_loops; j++) {
					var edges = parseFloat(a_boundaries_edges[j])
					,	type = parseFloat(a_boundaries_type[j])
					,	isPolyline = type & 2	// true = polyline
								//, false suppose line edges, independantly on '72'
					,	add1121 = 0 //isLineLike = false
					,	firstM = true;
					;
					i72+= isPolyline ? 1:0;
					for(var i=0, dd=""; i < edges; i++) {
						x = me.rounder( parseFloat(ent.AcDbHatch['10'][iXY+i]) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x');
						y = me.rounder( - ( parseFloat(ent.AcDbHatch['20'][iXY+i]) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y');
						if (isPolyline) {
							dd+= (firstM ? 'M ':'L ')+x+' '+y+' ';
						} else {
							var edge_type = parseFloat(a_edges_type[i72]);
							switch(edge_type) {
								case 1:	// line
									x2 = me.rounder( parseFloat(ent.AcDbHatch['11'][iXY2+add1121]) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) );
									y2 = me.rounder( - ( parseFloat(ent.AcDbHatch['21'][iXY2+add1121]) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) );
									dd+= (firstM ? 'M '+x+' '+y : '')+' L '+x2+' '+y2+' ';
									add1121++;	//isLineLike = true;
									break;
								case 2:	// circular arc
									dd+= (firstM ? 'M ':'L ')+x+' '+y+' ';	// ??
									break;
								case 3:	// elliptic arc
									dd+= (firstM ? 'M ':'L ')+x+' '+y+' ';	// ??
									// 11,21 ... radii
									add1121++;	//isLineLike = true;
									break;
								case 4:	// spline
									dd+="";
									break;
								default: // ????
									dd+="";
									break;
							}
							i72++;
						}
						firstM = false;
					}
					if (dd) {
						d+= dd+" Z ";
					}
					iXY+=i; iXY2+= add1121;	//(isLineLike ? i : 0);
				}
				return d;
			}
		,	d = gen_path_loops()
		,	src = '<path id="'+ iid +'" class="pen1 l_'+layid+'" d="'+ d +'" fill="url(#diagonalHatch)"'
				+' data-drawer="HATCH"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'/>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'path');
			s.setAttribute('data-drawer','HATCH');
			s.setAttribute('d',d);
			s.setAttribute('fill',"url(#diagonalHatch)");
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
,	_textFormat : function( t ) {
		var rx = /%%u(.+)/gmi
		,	m = rx.exec(t)
		;
		if (m) {
			t = m[1].replace(/./g,'_');
		}
		return t;
	}
,	TEXT : function(ent, parent, referer, overw) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbText', t:[1,7,10,20,40,50] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	isAttrib = !!overw
		
		,	e_AcDbText = isArr(ent.AcDbText) ? ent.AcDbText[0] : ent.AcDbText
		,	x = this.rounder( parseFloat(e_AcDbText['10']) 
				+(	(! isAttrib && this.inserter_def) ? this.inserter_def.x :0) 
				- (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y = this.rounder( - ( parseFloat(e_AcDbText['20']) 
				+(	(! isAttrib && this.inserter_def) ? this.inserter_def.y :0) 
				- (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	h = parseFloat(e_AcDbText['40'])
		,	angle = (360 - parseFloat(e_AcDbText['50'] || 0) )
		,	t = this._textFormat(e_AcDbText['1'])
		,	f = e_AcDbText['7'] || 'arial'	// = STANDART
		,	gen_transform = function() {
				return angle ?  ('rotate('+angle+','+x+','+y+')') : '';
			}
		,	trans = gen_transform()
		,	src = '<text id="'+ iid +'" class="pen1 l_'+layid+'" x="'+x+'" y="'+y
				+'" font-size="'+h+'px" '
				+ (angle ? ('transform="'+trans+'" ') : '') 
				+' data-drawer="'+(overw || 'TEXT')+'"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'>'+ t + '</text>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'text');
			s.setAttribute('data-drawer', overw || 'TEXT');
			s.setAttribute('x',x);
			s.setAttribute('y',y);
			s.setAttribute('font-size',h+'px');
			if (trans) {
				s.setAttribute('transform',trans);
			}
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			s.appendChild(s.ownerDocument.createTextNode(t));
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
,	MTEXT : function(ent, parent, referer) {	// http://dxfwrite.readthedocs.io/en/latest/entities/mtext.html 
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbMText', t:[1,3,7,10,20,40,50] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		
		,	x = this.rounder( parseFloat(ent.AcDbMText['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y = this.rounder( - ( parseFloat(ent.AcDbMText['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	h = parseFloat(ent.AcDbMText['40'])
		,	angle = (360 - parseFloat(ent.AcDbMText['50'] || 0) )
		,	me = this
		,	gen_texts = function( h ) {
				var chunks = [ent.AcDbMText['1']].concat(
						ent.AcDbMText['3'] ? me.ensureArr(ent.AcDbMText['3']) : []
					)
				,	t = chunks.join('')
				,	rows = t.split(/[\r\n]/g)
				,	ih=""
				;
				for(var i=0; i<rows.length; i++) {
					ih+='<tspan dx="0" dy="'+(i*h)+'">'+rows[i]+'</tspan>';
				}
				return ih;
			}
		,	t = gen_texts( h )	//_textFormat(AcDbMText['1'])
		,	f = ent.AcDbMText['7'] || 'arial'	// = STANDART
		,	gen_transform = function() {
				return angle ?  ('rotate('+angle+','+x+','+y+')') : '';
			}
		,	trans = gen_transform()
		,	src = '<text id="'+ iid +'" class="pen1 l_'+layid+'" x="'+x+'" y="'+y
				+'" font-size="'+h+'px" '
				+ (angle ? ('transform="'+trans+'" ') : '') 
				+' data-drawer="MTEXT"'
				+(referer ? ' data_referer="'+referer+'"' : '')
				+(this.inserter_def ? ' data-inserter="'+this.inserter_def.id+'"' : '')
				+'>'+ t + '</text>'
		,	gpar = lg && lg.g || parent
		;
		if (lg) {
			this.layer_groups[layer].src.push(src);
		}
		if (gpar) {
			var s = gpar.ownerDocument.createElementNS(svgNS,'text');
			s.setAttribute('data-drawer', 'MTEXT');
			s.setAttribute('x',x);
			s.setAttribute('y',y);
			s.setAttribute('font-size',h+'px');
			if (trans) {
				s.setAttribute('transform',trans);
			}
			s.setAttribute('class',"pen1 l_"+layid);
			s.setAttribute('id',iid);
			s.innerHTML = t;	//appendChild(s.ownerDocument.createTextNode(t));
			if (referer) {
				s.setAttribute('data-referef',referer);
			}
			if (this.inserter_def) {
				s.setAttribute('data-inserter',this.inserter_def.id);
			}
			gpar.appendChild(s);
		}
		return src;
	}
,	ATTDEF : function(ent, parent, referer) {	return '';	}
,	ATTRIB : function(ent, parent, referer) {
		if (referer) {
this.log_missing('blok ATTRIB', ent._line_+'/'+ent._idx_, ent._name_ );
		}
		return this.TEXT(ent, parent, referer, 'ATTRIB');
	}
//	,	DIMENSION : TODO? 
,	INSERT : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbBlockReference', t:[2,10,20,41,42,43,50] }
		]);
		var id = '_'+ent['5']
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	block_name = ent.AcDbBlockReference['2']
		,	x = this.rounder( parseFloat(ent.AcDbBlockReference['10']) - (referer ? 0 : this.cfg.clip_min_x) )
		,	y = this.rounder( - ( parseFloat(ent.AcDbBlockReference['20']) - (referer ? 0 : this.cfg.clip_min_y) ) )
	//	,	z = ent.AcDbBlockReference['30']
		,	x_scale = parseFloat(ent.AcDbBlockReference['41'] || 1)
		,	y_scale = parseFloat(ent.AcDbBlockReference['42'] || 1)
	//	,	z_scale = ent.AcDbBlockReference['43'] || 1
		,	angle = (360 - parseFloat(ent.AcDbBlockReference['50'] || 0) )
		,	trans = 'translate('+x+','+y+') rotate('+angle+','+x+','+y+')'+' scale('+x_scale+','+y_scale+')'
		,	gpar = lg && lg.g || parent
		;
		this.inserter_def = {
			id: id
		,	x: x
		,	y: -y	// znamienko si otacaju samotne prvky !
//		,	x_scale: x_scale
//		,	y_scale: y_scale
//		,	angle: angle
		,	trans: trans
		}
		return this._BLOCK(block_name, trans, gpar);
	}
,	SEQEND : function(ent, parent, referer) {	return '';	}
	
,	_BLOCK : function( block_name, trans, parent ) {
		var	a_BLOCKS = this.inst_DXF2TBL.a_BLOCKS
		,	block_ref = this.inst_DXF2TBL.find_handle_in_array(a_BLOCKS, block_name, '2', 'BLOCK')
		,	blok = block_ref.object
		,	i = block_ref.index
		,	ent = block_ref && a_BLOCKS[++i]	
		,	src = ''
		;
		if (ent) {
			while(ent._name_ != 'ENDBLK') {
				if (this[ent._name_]) {
					src+="\n"+this[ent._name_](ent, parent, block_name);
				} else {
this.log_missing(/*'a_BLOCKS'*/'BLK', i, ent._name_ );
				}
				ent = a_BLOCKS[++i];
			} 
		} else {
this.log_missing(/*'a_BLOCKS'*/'BLK name:', i, /*'Unknown BLOCK name '+*/block_name );
		}
		return src;
	}

,	draw_entities : function ( holder, start, cnt, callback ) {
		var a_ENTITIES = this.inst_DXF2TBL.a_ENTITIES
		this.init();
		
		start = start || 0;
		cnt = cnt || (a_ENTITIES.length - start);
		var src = ''
		,	spz	
		,	is_INSERT = false
		,	is_POLYLINE = false
		;
		this.holder = holder || this.cfg.svgG;

		for(var i=start; i<start+cnt; i++) {
			var ent = a_ENTITIES[i];
	// ---
			if (is_INSERT) {
				if ((ent._name_ == 'SEQEND') || (ent._name_ != 'ATTRIB')) { 
					this.inserter_def = null;
					is_INSERT = false;
				}
			}
			if (ent._name_ == 'INSERT') {
				is_INSERT = true;
			}
	// ---		// ---
			if (is_POLYLINE) {
				if ((ent._name_ == 'SEQEND') || (ent._name_ != 'VERTEX')) { 
					src+="\n"+this._polyline_gen(this.polyline_def);					
					this.polyline_def = null;
					is_POLYLINE = false;
				}
			}
			if (ent._name_ == 'POLYLINE') {
				is_POLYLINE = true;
			}
	// ---		
			if (this[ent._name_]) {
				src+="\n"+this[ent._name_](ent, this.holder);
			} else {
this.log_missing(/*'a_ENTITIES'*/'ENT', i, ent._name_);
			}
		}
		if (this.holder) {
			var svgcko = this.holder.ownerSVGElement;
			this.holder.removeAttribute('transform');
	//		if (! svgcko.getAttribute('viewBox')) {
				var wi = (this.svg_max_x - this.svg_min_x)
				,	he = (this.svg_max_y - this.svg_min_y)
				;
				svgcko.setAttribute('viewBox',''
					+ ( this.svg_min_x - wi/10 ) + ' '
					+ ( this.svg_min_y - he/10 ) + ' '
					+ ( wi + 2 * wi/10 ) + ' '
					+ ( he + 2 * he/10 )
				);
	//		}
			if (typeof UI != 'udefined') {
				UI.Body.resize(this.holder);
				UI.Layout.moveToFront(this.holder);
			}
			if (typeof SVGpzr != 'undefined') {
				spz = SVGpzr(this.holder);
			}
		}
		if (typeof callback == 'function') {
			callback(this.holder, spz);
		}
		return src;
	}

//	SVG staff
//	----------------------------
,	prepare_svg : function( svgG ) {
/* recommended :
//		<div id="DXF_SVG_canvas" >
//			<svg xmlns="http://www.w3.org/2000/svg" 
//				xmlns:svg="http://www.w3.org/2000/svg" 
//				xmlns:kres="http://www.sbmintegral.sk/docdefs/kres" 
//				xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" 
//				height="100%" viewBox="-1000 -9000 12000 10000" version="1.1" 
//			>		
//				<defs>
//					<clipPath id="all_clip">
//						<rect x="-1000" y="-9000" width="12000" height="10000"/>
//					</clipPath>
//					<pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
//						<path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" style="stroke:black; stroke-width:1" />
//					</pattern>
//					<marker id="markerCircle" markerWidth="2" markerHeight="2" refX="1.25" refY="1.25">
//						<circle cx="1.25" cy="1.25" r="0.75" style="stroke: none; fill:#000000; fill-opacity: 0.4;"/>
//					</marker>
//					<marker id="markerArrow" markerWidth="1" markerHeight="2" refX="1" refY="1" orient="auto">
//						<path d="M1,1 L0,0 L0,2 L1,1" style="fill:#000000; fill-opacity: 0.4;"/>
//					</marker>
//				</defs>
//				<g id="dxf2svg" class="pen1" clip-path="url(#myClip)">
//				</g>
//			</svg>	
//		</div>
*/
		svgG = svgG || this.cfg.svgG || gID(this.cfg.svgG_gID);
		if (svgG) {
			svgG.innerSVG = '';        // clean SVG space
		}
		return svgG;
	}
,	check_id_uniquity : function ( svgG ) {	// helper ... tester ID correct generation ... TODO solution
		svgG = svgG || this.cfg.svgG || gID(this.cfg.svgG_gID);
		var ids = {}
		,	nuIds = {}
		;
		svgG.queryXpath('.//@id', function(o) {
			var id = o.textContent;
			if (isDef(ids[id])) {
				nuIds[id]= (nuIds[id] ? ++nuIds[id] : 2);
			} else {
				ids[id]=1;
			}
		});
		Object.keys(nuIds).forEach(function(v){
			console.log(svgG.querySelectorAll('#'+v));
		})
	}

//	saveDXFSVG( gID('g#dxf2svg'), 'my_dxf2svg.svg' );
,	saveDXFSVG : function ( svgG, filename ) {
		svgG = svgG || this.cfg.svgG || gID(this.cfg.svgG_gID);
		filename = filename || 'dxf2svg.svg';
		var svgcko = svgG && svgG.ownerSVGElement
		,	svgtxt = ''
		;	
		if (svgG) {
			if (typeof SVGpzr != 'undefined') {
				SVGpzr(svgcko).deinit(); 
			}
			svgG.setAttribute('style','fill:none;stroke:black;');
			svgtxt = svgcko.outerXML;
			if (typeof saveTextAsFile != 'undefined') {
				saveTextAsFile(svgtxt, filename); 
			}
			if (typeof SVGpzr != 'undefined') {
				SVGpzr(svgcko); 
			}
		}
		return svgtxt;
	}

}

///</class> <!--  name="DXFdrawerSVG" -->

///</section>

///</file>