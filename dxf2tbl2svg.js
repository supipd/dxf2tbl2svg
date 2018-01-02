///<file name="dxf2tbl2svg.js" path="/.../dxf2tbl2svg.js" type="javascript">

DEBUG_LINE_NR = 10000000;
var svgNS = "http://www.w3.org/2000/svg";

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

,	find_handle_in_array : function ( section, id, tag, item_name ) {
		tag = tag || '5';	// default id
		var i,j, obj, keys
		,	checker = new RegExp("^_(\\.([\\w\\d_]+))?\."+tag+"$","i")
		,	matches
		;
		for(var i=0; i < section.length; i++) {
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
		drawer = drawer || DXFdrawerSVG(this);
		this.dxftxt = dxftxt || this.dxftxt;
		this.dxf_get_sections();    // read and parse DXF
		this.separall_arrays();            // prepare analytics of DXF entities

		var svgG = drawer.prepare_svg();
		return drawer.draw_entities( svgG, __, __, function() {    // draw SVG, and then call user callback
			if (typeof svg_callback == 'function') {
				svg_callback( svgG );
			}
		});  
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
	this.layer_groups = {};
	this.inserter_def = null;
	this.missing = [];
	return this;
}
///</function>

///<instance name="DXF2TBL">
///<property name="inst_DXF2TBL" type="CLASS" > instance of DXF2TBL class</param>
///<property name="cfg" type="Object">actual configuation </property>

///<property name="layer_groups" type="Object"> layers descriptions </property>
///<property name="inserter_def" type="Object"> actual INSERT state </property>
///<property name="missing" type="Array"> list of unknown entity drawers </property>
///</instance>

///<prototype name="DXF2TBL">
DXFdrawerSVG.prototype = {
	default_cfg : {
		holder : null
	,	svgG_gID : 'g#dxf2svg'
	,	svgG : null
		
	,	clip_min_x :  -572500.0	//648000;	//-100000000.0;
	,	clip_max_x :  -562500.0	//659000;	//100000000.0;
	,	clip_min_y : -1225000.0	//1223000;	//-100000000.0;
	,	clip_max_y : -1217000.0	//1232000;	//100000000.0;
	,	clip_min_z : -100000000.0
	,	clip_max_z : 100000000.0	
	
	,	DECS_M : 1000
	}
,	log_in_console : function ( section_mark, idx, ent_name ) {
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
	
,	rounder : function ( num ) {
		return isNaN(num) ? num : Math.round( num * this.cfg.DECS_M ) / this.cfg.DECS_M; 
	}
,	ensureArr : function (a) {
		return isArr(a) ? a : [a];
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
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbPoint['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) )
		,	cy = this.rounder( - ( parseFloat(ent.AcDbPoint['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) )
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
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbCircle['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) )
		,	cy = this.rounder( - ( parseFloat(ent.AcDbCircle['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) )
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
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	x1 = this.rounder( parseFloat(ent.AcDbLine['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) )
		,	x2 = this.rounder( parseFloat(ent.AcDbLine['11']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) )
		,	y1 = this.rounder( - ( parseFloat(ent.AcDbLine['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) )
		,	y2 = this.rounder( - ( parseFloat(ent.AcDbLine['21']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) )
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
//	,	POLYLINE : TODO from subsequent VERTEX-es
,	LWPOLYLINE : function(ent, parent, referer) {
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
					x = me.rounder( parseFloat(ent.AcDbPolyline['10'][i]) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) );
					y = me.rounder( - ( parseFloat(ent.AcDbPolyline['20'][i]) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) );
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
		,	gen_path = function() {
				var start_point = {
						x: cx + r * Math.cos(start_angle * Math.PI/180)
					,	y: cy + r * Math.sin(start_angle * Math.PI/180)
					}
				,	end_point = {
						x: cx + r * Math.cos(end_angle * Math.PI/180)
					,	y: cy + r * Math.sin(end_angle * Math.PI/180)
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
,	HATCH : function(ent, parent, referer) {	// provisorium only line edges !
//	https://www.autodesk.com/techpubs/autocad/acad2000/dxf/boundary_path_data_dxf_06.htm
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
						x = me.rounder( parseFloat(ent.AcDbHatch['10'][iXY+i]) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) );
						y = me.rounder( - ( parseFloat(ent.AcDbHatch['20'][iXY+i]) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) );
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
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	isAttrib = !!overw
		
		,	e_AcDbText = isArr(ent.AcDbText) ? ent.AcDbText[0] : ent.AcDbText
		,	x = this.rounder( parseFloat(e_AcDbText['10']) 
				+(	(! isAttrib && this.inserter_def) ? this.inserter_def.x :0) 
				- (referer ? 0 : this.cfg.clip_min_x) )
		,	y = this.rounder( - ( parseFloat(e_AcDbText['20']) 
				+(	(! isAttrib && this.inserter_def) ? this.inserter_def.y :0) 
				- (referer ? 0 : this.cfg.clip_min_y) ) )
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
//	,	MTEXT : TODO multiline text '1' base text string, '3' text string concatenation
,	ATTDEF : function(ent, parent, referer) {	return '';	}
,	ATTRIB : function(ent, parent, referer) {
		if (referer) {
this.log_in_console('blok ATTRIB', ent._line_+'/'+ent._idx_, ent._name_ );
		}
		return this.TEXT(ent, parent, referer, 'ATTRIB');
	}
//	,	DIMENSION : TODO? 
,	INSERT : function(ent, parent, referer) {
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
this.log_in_console(/*'a_BLOCKS'*/'BLK', i, ent._name_ );
				}
				ent = a_BLOCKS[++i];
			} 
		} else {
this.log_in_console(/*'a_BLOCKS'*/'BLK name:', i, /*'Unknown BLOCK name '+*/block_name );
		}
		return src;
	}

// draw_entities( gID('g#dxf2svg') );
,	draw_entities : function ( holder, start, cnt, callback ) {
		var a_ENTITIES = this.inst_DXF2TBL.a_ENTITIES
		this.layer_groups = {};
		
		start = start || 0;
		cnt = cnt || (a_ENTITIES.length - start);
		var src = ''
		,	spz	
		,	is_INSERT = false
		;
		holder = holder || this.cfg.holder;

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
	// ---		
			if (this[ent._name_]) {
				src+="\n"+this[ent._name_](ent, holder);
			} else {
this.log_in_console(/*'a_ENTITIES'*/'ENT', i, ent._name_);
			}
		}
		if (holder && (typeof SVGpzr != 'undefined') ) {
			spz = SVGpzr(holder);
		}
		if (typeof callback == 'function') {
			callback(holder, spz);
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
		svgG = this.cfg.svgG || gID('g#dxf2svg');
		if (svgG) {
			svgG.innerSVG = '';        // clean SVG space
			var svgcko = svgG.ownerSVGElement;
			if (! svgcko.getAttribute('viewBox')) {
				var wi = (this.cfg.clip_max_x - this.cfg.clip_min_x)
				,	he = (this.cfg.clip_max_y - this.cfg.clip_min_y)
				;
				svgcko.setAttribute('viewBox',''
					+ ( - wi/10 ) + ' '
					+ ( - he/10 ) + ' '
					+ ( wi + 2 * wi/10 ) + ' '
					+ ( he + 2 * he/10 )
				);
			}
		}
		return svgG;
	}
,	check_id_uniquity : function ( svg ) {	// helper ... tester ID correct generation ... TODO solution
		var ids = {}
		,	nuIds = {}
		;
		svg.queryXpath('.//@id', function(o) {
			var id = o.textContent;
			if (isDef(ids[id])) {
				nuIds[id]= (nuIds[id] ? ++nuIds[id] : 2);
			} else {
				ids[id]=1;
			}
		});
		Object.keys(nuIds).forEach(function(v){
			console.log(svg.querySelectorAll('#'+v));
		})
	}

//	saveDXFSVG( 'g#dxf2svg', 'my_dxf2svg.svg' );
,	saveDXFSVG : function ( svgG, filename ) {
		svgG = svgG || this.cfg.svgG || gID('g#dxf2svg');
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
		}
		return svgtxt;
	}

}

///</class> <!--  name="DXFdrawerSVG" -->

///</section>

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
			DXF2TBL().make( e.target.result)
		}
		// Read in the image file as a text.
		this.reader.readAsText(evt.target.files[0]);
	}
}

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
	,	le = tuplelist.length
	;
	start = parseFloat(start) || 0;
	count = parseFloat(count) || le - start;
	for(var i = start; i < Math.min(le, start+count); i++) {
		var txt = isDef(tuplelist[i].gcode) 
			? '<span>'+tuplelist[i].gcode+'</span><span>'+tuplelist[i].value+'</span>'
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

///</file>