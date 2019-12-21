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
,	separate_arrays : function ( section, outer, splitCodes, geoms ) {
		outer.length = 0;
		splitCodes = splitCodes || [0];
		geoms = geoms || [10,11,12,13,	20,21,22,23,30,31,32,33, 40,41,42,43, 72];
		var section_list = section.list
		,	le = section_list.length
		,	section_offset = section.offset
		,	objekt, primar, geom = null
		,	obj_name
		;
		for(var i=0; i< le; i++) {	
			var gv = section_list[i];
			if (i >= le-2) {	// remove possible ENDSEC, EOF
				if ( (gv.gcode == 0) &&
					( (gv.value == 'ENDSEC') || (gv.value == 'EOF') )
				)
					continue;
			}
if (i >= DEBUG_LINE_NR) {
	debugger;	
}
			if ( splitCodes.indexOf(gv.gcode) == -1 ) {
				var ig = geoms.indexOf(gv.gcode);
				if (ig > -1) {
					if (ig < 4) {	// after every X create GEOM	10,11,12,13	
						if ( ! objekt._GEOM ) {
							objekt._GEOM = [];
						}
						objekt._GEOM.push({});
						geom = objekt._GEOM[objekt._GEOM.length-1];
					}
					this.add_obj( geom || objekt, gv.gcode, gv.value );					
				} else {
					this.add_obj( objekt, gv.gcode, gv.value );
				}
			} else {
				if (gv.gcode == /*0*/splitCodes[0]) {
					if (primar) {
						outer.push(primar);
					}
					geom = null;
					objekt = primar = { _name_: gv.value, _line_: section_offset + i, _idx_: i};
				} else {
					if (gv.gcode == 100) {
						obj_name = gv.value;
						objekt = primar;
						if (isDef(DXFstructurer[obj_name])) {
							i = this.sequencer(section, i, objekt, DXFstructurer[obj_name]);
							continue;
						}
					}
					objekt = this.add_obj( objekt, gv.value, {} );
				}
			}
		}	
		if (primar) {
			outer.push(primar);
		}
		return outer;
	}
,	sequencer : function( section, i, primar, sequence ) {
		var section_list = section.list, gv
		,	objekt = primar
		,	par, parents = []
		,	finded = false, end = false
		,	sd, seq = sequence, act_j = -1, last_j = 0, end_j = seq.length, dir_j = 1 // 1: up -1: down
		,	up_down = function() {
				act_j += dir_j;
				if (dir_j == 1) {	// going up
					if (act_j == end_j) {
						end_j = -1; act_j = last_j; dir_j = -1;
					}
					return true;
				}
				if (dir_j == -1) {	//going down
					return act_j != end_j;
				}
			}
		;
		while( !end ) {
			gv = section_list[i]; finded = false;
// gcodes are not alway ordered as in DXF reference, so logic to try:
// go from actual [act_j] up to end of seq, if not finded,
// go from actual [act_j] down to start of seq, if not finded 
// go one level higher
			//	for(var j=act_j; j<seq.length; j++) {
			while( up_down() ) {	
				sd = seq[act_j][gv.gcode];
				if (isDef(sd)) {	// finded gcode
					if (isDef(sd.fi)) {
						if (! sd.fi(gv.value)) {
							continue;
						}
					}
					finded = true;
					if ( ! isStr(sd) ) {	// structured variable
						parents.push({o:objekt,s:seq, j:act_j});
						objekt = this.add_obj( objekt, sd.n || gv.value, {} );
						seq = sd.t; act_j = -1; last_j = 0;
					} else {
						last_j = act_j;
					}
					end_j = seq.length; dir_j = 1 // finded ... switch dir to UP
					this.add_obj( objekt, gv.gcode, gv.value );
					i++;
					break;
				}
			}
			if (finded) {
				 continue;
			}
			if (parents.length) {
				par = parents.pop(); objekt = par.o; 
				seq = par.s; act_j = par.j-1; last_j = par.j; end_j = seq.length, dir_j = 1 // up
				continue;
			}
			end = true;
		} 
		return i-1;	// last was not finded
	}
,	separall_arrays : function () {
		this.a_HEADER	= []; if (this.sections.HEADER && this.sections.HEADER.list.length) {
			this.separate_arrays(this.sections.HEADER, this.a_HEADER,[9,100]);
		}
		this.a_CLASSES	= []; if (this.sections.CLASSES && this.sections.CLASSES.list.length) {
			this.separate_arrays(this.sections.CLASSES, this.a_CLASSES,[0,100]);
		}
		this.a_TABLES	= []; if (this.sections.TABLES && this.sections.TABLES.list.length) {
			this.separate_arrays(this.sections.TABLES, this.a_TABLES,[0,100]);
		}
		this.a_BLOCKS	= []; if (this.sections.BLOCKS && this.sections.BLOCKS.list.length) {
			this.separate_arrays(this.sections.BLOCKS, this.a_BLOCKS,[0,100]);
		}
		this.a_ENTITIES	= []; if (this.sections.ENTITIES && this.sections.ENTITIES.list.length) {
			this.separate_arrays(this.sections.ENTITIES, this.a_ENTITIES,[0,100]);
		}
		this.a_OBJECTS	= []; if (this.sections.OBJECTS && this.sections.OBJECTS.list.length) {
			this.separate_arrays(this.sections.OBJECTS, this.a_OBJECTS,[0,100],[]);
		}
		this.a_THUMBNAILIMAGE	= []; if (this.sections.THUMBNAILIMAGE && this.sections.THUMBNAILIMAGE.list.length) {
			this.separate_arrays(this.sections.THUMBNAILIMAGE, this.a_THUMBNAILIMAGE,[90,100],[]);
		}
	}
,	find_handle_in_array : function ( section, id, tag, item_name, last_idx ) {
		tag = tag || '5';	// default id
		last_idx = parseInt(last_idx);
		last_idx = isNaN(last_idx) ? -1 : Math.max(last_idx,-1);
		var i,j, obj, keys
		,	checker = new RegExp("^_(\\.([\\w\\d_]+))?\\\."+tag+"$","i")
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
// D9B071D01A0C8010
,	make :  function( dxftxt, drawer, svg_callback ) {
		var me = this
		,	pxt = gID('pending_xslt_trafo')
		;
		this.init();
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
	,	svg_viewBox : ''
	,	svg_bckColor : '#FFFFFF'
		
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
		,	{ n:'AcDbPoint', t:['_GEOM'] }	//t:[10,20] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbPoint._GEOM[0]['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	cy = this.rounder( - ( parseFloat(ent.AcDbPoint._GEOM[0]['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
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
		,	{ n:'AcDbCircle', t:['_GEOM'] }	//, t:[10,20,40] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbCircle._GEOM[0]['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	cy = this.rounder( - ( parseFloat(ent.AcDbCircle._GEOM[0]['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
// 50	start angle		
// 51	end angle		
		,	r = this.rounder( parseFloat(ent.AcDbCircle._GEOM[0]['40']) )
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
		,	{ n:'AcDbLine', t:['_GEOM'] }	//, t:[10,11,20,21] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	x1 = this.rounder( parseFloat(ent.AcDbLine._GEOM[0]['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	x2 = this.rounder( parseFloat(ent.AcDbLine._GEOM[1]['11']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y1 = this.rounder( - ( parseFloat(ent.AcDbLine._GEOM[0]['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	y2 = this.rounder( - ( parseFloat(ent.AcDbLine._GEOM[1]['21']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
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
		,	{ n:'AcDb2dPolyline', t:['_GEOM',70] }	//, t:[10,20,30,70] }
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
		,	x : this.rounder( parseFloat(ent.AcDb2dPolyline._GEOM[0]['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y : this.rounder( - ( parseFloat(ent.AcDb2dPolyline._GEOM[0]['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
	//	,	z : this.rounder( - ( parseFloat(ent.AcDb2dPolyline._GEOM[0]['30']) +(this.inserter_def ? this.inserter_def.z :0) - (referer ? 0 : this.cfg.clip_min_z) ) )
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
		,	{ n:'AcDb2dVertex', t:['_GEOM'] }	//, t:[10,20,42] }
		]);
		var id = '_'+ent.AcDbEntity['5']
		,	iid = (this.polyline_def ? this.polyline_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	x = this.rounder( parseFloat(ent.AcDb2dVertex._GEOM[0]['10']) +(this.polyline_def ? this.polyline_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y = this.rounder( - ( parseFloat(ent.AcDb2dVertex._GEOM[0]['20']) +(this.polyline_def ? this.polyline_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	bulgeA = parseFloat(ent.AcDb2dVertex._GEOM[0]['42'])
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
		,	smer = (bulge < 0) ? 1 : 0
		;
		return ' A '+r+','+r+' 0, 0,'+smer+', '+vrtx2.x+','+vrtx2.y+' ';
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
				d+= ' L '+vrtx2.x+','+vrtx2.y ;
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
		,	{ n:'AcDbPolyline', t:['_GEOM',70,75,90] }	//, t:[10,20,70,43,40,41,75,90] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	pline_flag = ent.AcDbPolyline['70']
		,		closed = pline_flag && (pline_flag & 1)
		,		Plinegen = pline_flag && (pline_flag & 128)
		,	constant_width = ent.AcDbPolyline._GEOM[0]['43']
		,	start_width = ent.AcDbPolyline._GEOM[0]['40']
		,	end_width = ent.AcDbPolyline._GEOM[0]['41']
		,	curves_flag = ent.AcDbPolyline['75']
		,	num_vertices = parseFloat(ent.AcDbPolyline['90'])
		,	me = this
		,	gen_path = function() { 
				var d="", x,y;
				for(var i=0; i<num_vertices; i++) {
					x = me.rounder( parseFloat(ent.AcDbPolyline._GEOM[i]['10']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x');
					y = me.rounder( - ( parseFloat(ent.AcDbPolyline._GEOM[i]['20']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y');
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

,	_gen_arc_path : function(cx,cy,rx,ry,dsa,dea,counterclockwise) {
		var	start_angle = (360 - dsa) % 360	// 74 ... 286	//	359	... 1
		,	end_angle = (360 - dea) % 360	// 87 ... 273	//	62	...	298
		,	large = ( (dea < dsa ? 360:0) + dea - dsa) > 180 ? 1 : 0	//	273 - 286 = -13
		,	r = rx	// TODO elliptic arc
		,	start_point = {
				x: this.rounder(cx + r * Math.cos(start_angle * Math.PI/180), 'x')
			,	y: this.rounder(cy + r * Math.sin(start_angle * Math.PI/180), 'y')
			}
		,	end_point = {
				x: this.rounder(cx + r * Math.cos(end_angle * Math.PI/180), 'x')
			,	y: this.rounder(cy + r * Math.sin(end_angle * Math.PI/180), 'y')
			}
		;
		return 'M '+ start_point.x +' '+ start_point.y
			+ ' A '+rx+','+ry+' 0'	// For arc assume no x-axis rotation. 
	//		+ ( ( (end_angle > start_angle) && (end_angle - start_angle > 180) )
	//			? ' 1,0' : ' 0,0' )
	//		+ ( (dea > dsa) ? ' 1,0' : ' 0,0' )
			+ ' '+ large +',0'
			+ ' '+ end_point.x +','+ end_point.y
		;
	}
,	ARC : function(ent, parent, referer) {
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbCircle', t:['_GEOM'] }	//, t:[10,20,40] }
		,	{ n:'AcDbArc', t:[50,51] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	cx = this.rounder( parseFloat(ent.AcDbCircle._GEOM[0]['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) )
		,	cy = this.rounder( - ( parseFloat(ent.AcDbCircle._GEOM[0]['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) )
		,	r = this.rounder( parseFloat(ent.AcDbCircle._GEOM[0]['40']) )
		,	dsa = parseFloat(ent.AcDbArc['50'])
		,	dea = parseFloat(ent.AcDbArc['51'])
		,	d = this._gen_arc_path(cx,cy,r,r,dsa,dea)
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
		,	{ n:'AcDbTrace', t:['_GEOM'] }	//, t:[10,11,12,13,20,21,22,23] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	num_vertices = ent.AcDbTrace._GEOM.length	//isDef(ent.AcDbTrace['13']) ? 4 : 3
		,	me = this
		,	gen_path = function() { 
				var d="", x,y;
				for(var i=0; i<num_vertices; i++) {
					x = me.rounder( parseFloat(ent.AcDbTrace._GEOM[i]['1'+i]) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x');
					y = me.rounder( - ( parseFloat(ent.AcDbTrace._GEOM[i]['2'+i]) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y');
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
/* old ,	HATCH : function(ent, parent, referer) {	// provisorium only line edges !
//	https://www.autodesk.com/techpubs/autocad/acad2000/dxf/boundary_path_data_dxf_06.htm
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbHatch', t:['_GEOM',70,91,92,93] }	//, t:[10,11,20,21,70,72,91,92,93] }
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
						x = me.rounder( parseFloat(ent.AcDbHatch._GEOM[iXY+i]['10']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x');
						y = me.rounder( - ( parseFloat(ent.AcDbHatch._GEOM[iXY+i]['20']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y');
						if (isPolyline) {
							dd+= (firstM ? 'M ':'L ')+x+' '+y+' ';
						} else {
							var edge_type = parseFloat(a_edges_type[i72]);
							switch(edge_type) {
								case 1:	// line
									x2 = me.rounder( parseFloat(ent.AcDbHatch._GEOM[iXY2+add1121]['11']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) );
									y2 = me.rounder( - ( parseFloat(ent.AcDbHatch._GEOM[iXY2+add1121]['21']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) );
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
	}	*/

,	HATCH : function(ent, parent, referer) {	// provisorium only line edges !
//	https://www.autodesk.com/techpubs/autocad/acad2000/dxf/boundary_path_data_dxf_06.htm
		ent = this.structureENT(ent,[
			{ n:'AcDbEntity', t:[8] }
		,	{ n:'AcDbHatch', t:['_GEOM',70,91,92,93] }	//, t:[10,11,20,21,70,72,91,92,93] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	solid_fill_flag = ent.AcDbHatch['70']
		,	me = this
		
		,	gen_path_loops = function() { 
				var d="", dd=""	//, bulge
				,	num_boundaries_loops = parseFloat(ent.AcDbHatch.BoundaryLoops['91'])
				,	boundary_data = me.ensureArr(ent.AcDbHatch.BoundaryLoops.BoundaryData)
				;
				for(var j=0; j < num_boundaries_loops; j++) {
					var boundary = boundary_data[j]
					,	boundary_type = parseFloat(boundary['92'])
					,	isPolyline = boundary_type & 2	// true = polyline
					,	count = parseFloat(boundary['93'])
					;
					if (isPolyline) {
						var bulge = parseFloat(boundary['72'])
						,	closed = parseFloat(boundary['73'])
						,	firstM = true;
						;
						for(var e=0; e<count; e++) {
							var vertex = boundary.VERTEXES[e]
							,	x = me.rounder( parseFloat(vertex['10']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x')
							,	y = me.rounder( - ( parseFloat(vertex['20']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y')
							,	bulgeF = parseFloat(vertex['42'])
							,	bulge = isNaN(bulgeF) ? 0 : bulgeF
							;
		// TODO working with bulge !
							dd+= (firstM ? 'M ':'L ')+x+' '+y+' ';
							firstM = false;
						}
					} else {
						var edges = me.ensureArr(boundary.Edge);
						for(var e=0; e<count; e++) {
							var	edge = edges[e]
							,	edge_type = parseFloat(edge['72'])
							;
							switch(edge_type) {
								case 1 : 	// line
									var	x1 = me.rounder( parseFloat(edge['10']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x')
									,	y1 = me.rounder( - ( parseFloat(edge['20']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y')
									,	x2 = me.rounder( parseFloat(edge['11']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x')
									,	y2 = me.rounder( - ( parseFloat(edge['21']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y')
									dd+=' M '+x1+','+y1+' L '+x2+','+y2;
									break;
								case 2 : 	// circular arc
									var	cx = me.rounder( parseFloat(edge['10']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x')
									,	cy = me.rounder( - ( parseFloat(edge['20']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y')
									,	r = me.rounder( parseFloat(edge['40']) )
									,	dsa = parseFloat(edge['50'])
									,	dea = parseFloat(edge['51'])
									,	counterclockwise = parseFloat(edge['73'])
									;
									dd+= me._gen_arc_path(cx,cy,r,r,dsa,dea,counterclockwise);
									break;
								case 3 : 	// elliptic arc
									var	cx = me.rounder( parseFloat(edge['10']) +(me.inserter_def ? me.inserter_def.x :0) - (referer ? 0 : me.cfg.clip_min_x) , 'x')
									,	cy = me.rounder( - ( parseFloat(edge['20']) +(me.inserter_def ? me.inserter_def.y :0) - (referer ? 0 : me.cfg.clip_min_y) ) , 'y')
									,	mx = me.rounder( parseFloat(edge['11']) )	// relative to center
									,	my = me.rounder( - ( parseFloat(edge['21']) ) )	// relative to center
									,	rx = Math.sqrt( mx*mx + my*my )
									,	per = parseFloat(edge['40'])	// percentage of major axis
									,	ry = rx * per
									,	dsa = parseFloat(edge['50'])
									,	dea = parseFloat(edge['51'])
									,	counterclockwise = parseFloat(edge['73'])
									dd+= me._gen_arc_path(cx,cy,rx,ry,dsa,dea,counterclockwise);
									break;
								case 4 : 	// spline
			// TODO
									break;
							}
						}
					}
					if (dd) {
						d+= dd+" Z ";
					}
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
		,	{ n:'AcDbText', t:['_GEOM',1,7,50] }	//, t:[1,7,10,20,40,50] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	isAttrib = !!overw
		
		,	e_AcDbText = isArr(ent.AcDbText) ? ent.AcDbText[0] : ent.AcDbText
		,	x = this.rounder( parseFloat(e_AcDbText._GEOM[0]['10']) 
				+(	(! isAttrib && this.inserter_def) ? this.inserter_def.x :0) 
				- (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y = this.rounder( - ( parseFloat(e_AcDbText._GEOM[0]['20']) 
				+(	(! isAttrib && this.inserter_def) ? this.inserter_def.y :0) 
				- (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	h = parseFloat(e_AcDbText._GEOM[0]['40'])
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
		,	{ n:'AcDbMText', t:['_GEOM',1,3,7,50] }	//, t:[1,3,7,10,20,40,50] }
		]);
		var id = '_'+ent['5']
		,	iid = (this.inserter_def ? this.inserter_def.id+"_" : "") + id
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		
		,	x = this.rounder( parseFloat(ent.AcDbMText._GEOM[0]['10']) +(this.inserter_def ? this.inserter_def.x :0) - (referer ? 0 : this.cfg.clip_min_x) , 'x')
		,	y = this.rounder( - ( parseFloat(ent.AcDbMText._GEOM[0]['20']) +(this.inserter_def ? this.inserter_def.y :0) - (referer ? 0 : this.cfg.clip_min_y) ) , 'y')
		,	h = parseFloat(ent.AcDbMText._GEOM[0]['40'])
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
		,	{ n:'AcDbBlockReference', t:['_GEOM',2,50] }	//, t:[2,10,20,41,42,43,50] }
		]);
		var id = '_'+ent['5']
		,	layer = ent.AcDbEntity['8']
		,	lg = this.layer(layer,parent)
		,	layid = lg ? lg.id : 'plain'
		,	block_name = ent.AcDbBlockReference['2']
		,	x = this.rounder( parseFloat(ent.AcDbBlockReference._GEOM[0]['10']) - (referer ? 0 : this.cfg.clip_min_x) )
		,	y = this.rounder( - ( parseFloat(ent.AcDbBlockReference._GEOM[0]['20']) - (referer ? 0 : this.cfg.clip_min_y) ) )
	//	,	z = ent.AcDbBlockReference['30']
		,	x_scale = parseFloat(ent.AcDbBlockReference._GEOM[0]['41'] || 1)
		,	y_scale = parseFloat(ent.AcDbBlockReference._GEOM[0]['42'] || 1)
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
			svgcko.style.backgroundColor = this.cfg.svg_bckColor;
			if (this.cfg.svg_viewBox) {
				svgcko.setAttribute('viewBox', this.cfg.svg_viewBox);
			} else {
				var wi = (this.svg_max_x - this.svg_min_x)
				,	he = (this.svg_max_y - this.svg_min_y)
				;
				svgcko.setAttribute('viewBox',''
					+ ( this.svg_min_x - wi/10 ) + ' '
					+ ( this.svg_min_y - he/10 ) + ' '
					+ ( wi + 2 * wi/10 ) + ' '
					+ ( he + 2 * he/10 )
				);
			}
			if (typeof DXFcolors != 'undefined') {
				DXFcolors.colorize_svg(this.holder);
			}
			if (typeof UI != 'undefined') {
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
			svgG.innerHTML = '';	//innerSVG = '';        // clean SVG space
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