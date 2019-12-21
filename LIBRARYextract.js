///<file name="LIBRARYextract.js" path="/.../LIBRARYextract.js" type="javascript">

///<section name="aliasLIBRARY" desc="LIBRARY fake aliases for autonomous functionality">
if (typeof isDef == 'undefined') {
	__ = undefined;
	function getType(thing){
		if(thing===null)return "[object Null]"; // special case
		return Object.prototype.toString.call(thing);
	}
	isDef = function(thing) { return (thing !== undefined); }
	isArr = function(thing) { return Array.isArray ? Array.isArray(thing) : getType(thing) == "[object Array]"; }
	isFnc = function(thing) { return getType(thing) == "[object Function]"; }
	isStr = function(thing) { return getType(thing) == "[object String]"; }
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

///</file>