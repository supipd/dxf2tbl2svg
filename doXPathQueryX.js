//<script id="doXPathQuery" type="text/javascript">//<![CDATA[

if (! document.evaluate) {
	loadman([
//		"/GITHUB/wicked-good-xpath/FROMinstall/wgxpath.install.js"
		"/GITHUB/wicked-good-xpath/REWORK/loadmanWGX.js"
	,	function() {
			wgxpath.install();	// for main window, window.document
			wgxpath.setTo = function( doc ) {
			  // Installation is a noop if native XPath is available.
			  if (doc['evaluate']) {
				return;
			  }
			  doc['evaluate'] = function(expr, context, nsResolver, type, result) {
				return new wgxpath.XPathExpression_(expr, nsResolver).
					evaluate(context, type);
			  };
			  doc['createExpression'] = function(expr, nsResolver) {
				return new wgxpath.XPathExpression_(expr, nsResolver);
			  };
			  doc['createNSResolver'] = function(node) {
				return new wgxpath.XPathNSResolver_(node);
			  };				
			}
		}
	]);
}

(function( glob ) {		//CLASS XXX
/*	tag namespace independent:
/*[local-name()="response"]/@command
*/

	glob.G_ns = {	//for debug let in in global space
	//    'null'  : 'http://www.w3.org/1999/xhtml',
		'a'     : 'http://www.w3.org/1999/xhtml',	//with abbrevations for write-less Xath queries
		'xhtml' : 'http://www.w3.org/1999/xhtml',
		'x' 	: 'http://www.w3.org/1999/xhtml',
		'xsl'	: "http://www.w3.org/1999/XSL/Transform",
		't'		: "http://www.w3.org/1999/XSL/Transform",
		'svg'   : 'http://www.w3.org/2000/svg',
		's'   	: 'http://www.w3.org/2000/svg',
		'mathml': 'http://www.w3.org/1998/Math/MathML',
		'm'		: 'http://www.w3.org/1998/Math/MathML',
		'xlink'	: 'http://www.w3.org/1999/xlink',
		'l'		: 'http://www.w3.org/1999/xlink',
		'scxml'	: 'http://www.w3.org/2005/07/scxml',			//state machine
		'c'		: 'http://www.w3.org/2005/07/scxml',
		'kres'  : 'http://www.sbmintegral.sk/docdefs/kres',		//my own
		'k'		: 'http://www.sbmintegral.sk/docdefs/kres',
		'ng'	: 'http://angularjs.org'						//angular
		
	,	'urn'	: "debugger_protocol_v1"
	,	'xdebug': "http://xdebug.org/dbgp/xdebug"				//DBGp
	}

  XXX = function( ns, nsResolverFnc ) {
  
	this.G_ns = ns || glob.G_ns;
	
	var self_G_ns = this.G_ns;
	this.nsResolverFnc = nsResolverFnc || function (prefix) { //for debug let in in global space
	  return self_G_ns[prefix] || null;	//known prefix, or null as default namespace 
	}
	
  }

  XXX.prototype = {
//	X.resolveXPathToString( $0, ( X.updateGns(document), X.gNSlist())  )	//riadna sialenost !!!
	resolveXPathToString : function (a, nsl, relativeEl) {
		var nslist = null;
        function resolveTraverse(a, clbk) {
            var d, i, g, c, m, l;
            if (a.parentNode.nodeType === 9) return "";
            c = a.parentNode;
            g = 0;
            l = null;
            d = 0;
            for (i = c.childNodes.length; d < i; d++) m = c.childNodes[d], clbk(m, a) && (g++, m === a && (l = g));
            return g === 1 ? "" : "[" + l + "]"
        }
        function resolveELEMENT(a, b) {
            return a.nodeType === 1 && a.nodeName === b.nodeName
        }
        function resolveCDATA(a) {
            return a.nodeType === 3 || a.nodeType === 4
        }
        function resolvePROCESSING(a, b) {
            return a.nodeType === 7 && a.target === b.target
        }
        function resolveCOMMENT(a) {
            return a.nodeType === 8
        }
		function resolveNS (a) {
		//	var nslist = XMLUtilities.namespaceList;
			if (a && a.namespaceURI) {
			 for (var i=0; i<nslist.length; i++) {
				if (nslist[i].key == a.namespaceURI) {
					return nslist[i].prefix || nslist[i].alias;
				}
			 }
			}
			return null;
		}
        function resolveMainRecursive(a) {
			if (relativeEl && (relativeEl === a)) {
				return '.';
			}
			var ns = resolveNS(a);
            switch (a.nodeType) {
            case 1:	//ELEMENT_NODE
                return resolveMainRecursive(a.parentNode) + '/'
					//+'<span class="element">' 
					+ ((a.nodeName.indexOf(":") > -1) ? "" : (ns ? (ns+":") : "")) + a.nodeName 
					//+ "</span>" 
					+ resolveTraverse(a, resolveELEMENT);
            case 2:	//ATTRIBUTE_NODE
                var f = resolveMainRecursive,
                    k;
                    if (a.ownerElement) k = a.ownerElement;
                    else {
                        k = null
                    }
                return f(k) + '/'
					//+'<span class="attributeName">'
					+'@' 
					+ ((a.nodeName.indexOf(":") > -1) ? "" : (ns ? (ns+":") : "")) + a.nodeName 
					//+ "</span>";
            case 3:	//TEXT_NODE
            case 4:	//CDATA_SECTION_NODE
                return resolveMainRecursive(a.parentNode) + '/'
					//+'<span class="attributeValue">'
					+'text()'
					//+'</span>' 
					+ resolveTraverse(a, resolveCDATA);
            case 7:	//PROCESSING_INSTRUCTION_NODE
                return resolveMainRecursive(a.parentNode) + '/processing-instruction("'
					//+'<span class="piName">' 
					+ a.target 
					//+'</span>'
					+'")' 
					+ resolveTraverse(a, resolvePROCESSING);
            case 8:	//COMMENT_NODE
                return resolveMainRecursive(a.parentNode) + '/'
					//+'<span class="comment">'
					+'comment()'
					//+'</span>' 
					+ resolveTraverse(a, resolveCOMMENT);
            case 9:	//DOCUMENT_NODE
                return "";
            default:
                throw Error("Unknown nodeType while generating xpath");
            }
        }     
		nslist = nsl || this.gNSlist();
		var result = a ? resolveMainRecursive(a) : ""
		return result;
    }
,	alfabetNSprefix : function( ns ) {
		var alfabet   = 'abcdefghijklmnopqrstuvwxyz'
		,	y,z, found
		;
		alfabet += alfabet.toUpperCase();
		alfabet = alfabet.split('');
		for (y = 0; y < alfabet.length; y++) {
			found = false;
			for (z = 0; z < ns.length; z++) {
				if (ns[z].prefix === alfabet[y]) {
					found = true;
					break;
				}
			}
			if (found === false) {
				return alfabet[y];
			}
		}
		if (y === alfabet.length) {
			throw new Error(
				"Cannot handle so many undeclared namespaces."
			);
		}
	}
///<function code="javascript">extractNS
///<param type="Node" title=" (X)HTML TEXT z ktoreho chceme extrahovat v nom pouzite namespaces">a</param>
///<param type="Array" optional="optional" title="OPTIONAL aktualny zoznam namespaces, ktory chceme aktualizovat">nslist</param>
///<desc> Funkcia pretraverzuje DOM strukturu zadaneho Node elementu a vyberie vsetky najdene namespaces
/// pricom ich oznackovava bude explicitnym najdenym namespace prefix-om, resp. priraduje pismenko abecedy
/// Pocet takto registrovanych namespaces je momentalne obmedzeny poctom znakov zakladnej abecedy (var d)
///</desc>
///<issues> Funkcia pracuje na zaklade prosteho textoveho spracovania pomocou regularnych vyrazov
/// neosetruje komentare, a teda akakolvek (so strukturou dokumentu samotneho nesuvisiaca)
/// poznamka (v javascripte, html komentovanom texte) je ZAHRNUTA do hladania namespaces,
/// napriek tomu, ze sa NEVYSKYTNE v generovanej DOM strukture !!!
/// RADSEJ NEPOUZIVAT a nahradit funkciou findAllNS pracujucej nad skutocnym DOM dokumentu !!! 

/* TEST:  http://localhost/GITHUB/ajaxslt-0.8.1/test/xslt.xhtml 
eans = X.extractNS(document.documentElement.innerHTML,[]);JSON.stringify(eans)
	generuje:
"[
{"prefix":"default","key":"http://www.w3.org/1999/xhtml","generated":false,"alias":""},
{"prefix":"a","key":"http://www.w3.org/2000/svg","generated":true,"alias":""},
{"prefix":"xlink","key":"http://www.w3.org/1999/xlink","generated":false,"alias":""},
{"prefix":"ng","key":"http://angularjs.org","generated":false,"alias":""},
{"prefix":"kres","key":"http://www.sbmintegral.sk/docdefs/kres","generated":false,"alias":""},
{"prefix":"xsl","key":"http://www.w3.org/1999/XSL/Transform","generated":false,"alias":""},
{"prefix":"ext","key":"http://exslt.org/common","generated":false,"alias":""},
{"prefix":"db","key":"http://ananas.org/2002/docbook/subset","generated":false,"alias":""},
{"prefix":"lxslt","key":"http://xml.apache.org/xslt","generated":false,"alias":""},
{"prefix":"result","key":"http://www.example.com/results","generated":false,"alias":""},
{"prefix":"counter","key":"MyCounter","generated":false,"alias":""},
{"prefix":"msxsl","key":"urn:schemas-microsoft-com:xslt","generated":false,"alias":""},
{"prefix":"user","key":"http://mycompany.com/mynamespace","generated":false,"alias":""},
{"prefix":"b","key":"urn:debugger_protocol_v1","generated":true,"alias":""},
{"prefix":"xdebug","key":"http://xdebug.org/dbgp/xdebug","generated":false,"alias":""}
]"
	kym:
fans = X.findAllNS($0, []); JSON.stringify(fans)
	generuje:
"[
{"prefix":"a","key":"http://www.w3.org/1999/xhtml","generated":true,"alias":""},
!!!		{"prefix":"svg","key":"http://www.w3.org/2000/svg","generated":false,"alias":""},
{"prefix":"xlink","key":"http://www.w3.org/1999/xlink","generated":false,"alias":""},
{"prefix":"ng","key":"http://angularjs.org","generated":false,"alias":""},
{"prefix":"kres","key":"http://www.sbmintegral.sk/docdefs/kres","generated":false,"alias":""},
!!!+	{"prefix":"xml","key":"http://www.w3.org/XML/1998/namespace","generated":false,"alias":""},
{"prefix":"xsl","key":"http://www.w3.org/1999/XSL/Transform","generated":false,"alias":""},
{"prefix":"ext","key":"http://exslt.org/common","generated":false,"alias":""},
{"prefix":"db","key":"http://ananas.org/2002/docbook/subset","generated":false,"alias":""},
{"prefix":"lxslt","key":"http://xml.apache.org/xslt","generated":false,"alias":""},
{"prefix":"result","key":"http://www.example.com/results","generated":false,"alias":""},
{"prefix":"counter","key":"MyCounter","generated":false,"alias":""},
{"prefix":"msxsl","key":"urn:schemas-microsoft-com:xslt","generated":false,"alias":""},
{"prefix":"user","key":"http://mycompany.com/mynamespace","generated":false,"alias":""},
{"prefix":"b","key":"urn:debugger_protocol_v1","generated":true,"alias":""},
{"prefix":"xdebug","key":"http://xdebug.org/dbgp/xdebug","generated":false,"alias":""}
]"

*/
///</issues>
///<example>
// JSON.stringify( X.extractNS(document.documentElement.outerHTML), X.gNSlist() );	//update central G_ns 
///</example>
	/** Scan a string of XML and extract namespaces from it.
	  * Assigns generated prefixes (deterministic) for un-prefixed
	  * namespaces.
	  * @param  {string} xml
	  * @return {array}
	  * @config {string}  prefix
	  * @config {string}  key
	  * @config {boolean} generated
	  */
,	extractNS : function ( xml, nslist) {
		nslist = nslist || this.gNSlist();

		var x, y, z, a, tags, found,
			findTags = /<\w+(?:\:\w+)?\s+([\s\S]*?)>/g,
			findNS   = /xmlns(?:\:(\w+))?\s*=\s*([\x22\x27])([\s\S]+?)\2/g,
			alfabet   = 'abcdefghijklmnopqrstuvwxyz',
			ns       = [];

		findTags.lastIndex = 0;
		tags = xml.match(findTags) || [];

		// Locate all defined xmlns attributes in the source. If they have a
		// prefix, grab that too. First, we find all tags. Then we find all
		// attributes within those tags.
		for (x = 0; x < tags.length; x++) {
			findNS.lastIndex = 0;
			if (findNS.test(tags[x])) {
				findNS.lastIndex = 0;

				a = findNS.exec(tags[x]);
				while (a !== null) {

					ns.push({
						prefix: (a[1] === '') ? undefined : a[1],
						key: a[3],
						generated: (!a[1])
					,	alias: ""
					});

					a = findNS.exec(tags[x]);
				}
			}
		}

		/*jslint continue: true */

		// No point in returning duplicate keys, so we consolidate now... The
		// shortest prefix is preferred.
		a = nslist || [];

outer:
		for (x = 0; x < ns.length; x++) {

			for (y = 0; y < a.length; y++) {
				if (a[y].key === ns[x].key) {

					// If our unique array has an undefined prefix,
					if (a[y].prefix === undefined) {
						// And the source array is also undefined,
						if (ns[x].prefix === undefined) {
							// Skip to the next source item.
							continue outer;
						}
						// Otherwise, update the unique array.
						a[y].prefix = ns[x].prefix;
						a[y].generated = false;
						continue outer;
					}

					// If the source has an undefined prefix
					// (but the unique array does not),
					// continue to the next source item.
					if (ns[x].prefix === undefined) {
						continue outer;
					}

					// If neither unique nor source have an undefined
					// prefix, then take the shorter of the two prefixes.
					if (ns[x].prefix.length < a[y].prefix.length) {
						a[y].prefix = ns[x].prefix;
						continue outer;
					}
				}
			}

			a.push(ns[x]);
		}
		ns = a;

		/*jslint continue: false */

		// We also wish to remove duplicate prefix / key sets.
		x = ns.length;
		while (x--) {
			for (y = 0; y < x; y += 1) {
				if (
					a[x].prefix === a[y].prefix &&
						a[x].key === a[y].key
				) {
					a.splice(x, 1);
					break;
				}
			}
		}

		// Any "undefined" prefix must be given a key, or else it would be
		// darn hard to reach it with an xpath request.  We assign prefixes
		// out of the alphabet, starting at "a" and going until we run out.
		// Of course, we have to check to make sure it is unused before we
		// assign it...
		alfabet += alfabet.toUpperCase();
		alfabet = alfabet.split('');
		for (x = 0; x < ns.length; x++) {
			if (ns[x].prefix === undefined) {

				for (y = 0; y < alfabet.length; y++) {

					found = false;

					for (z = 0; z < ns.length; z++) {
						if (ns[z].prefix === alfabet[y]) {
							found = true;
							break;
						}
					}

					if (found === false) {
						ns[x].prefix = alfabet[y];
						break;
					}
				}

				if (y === alfabet.length) {
					throw new Error(
						"Cannot handle so many undeclared namespaces."
					);
				}

			}
		}


		if (nslist) {
			for (x = 0; x < ns.length; x++) {
				for (y = 0; y < nslist.length; y++) {
					if ((ns[x].prefix == nslist[y].prefix) && (nslist[y].alias)) {
						ns[x].alias = nslist[y].alias; break;
					}
				}
			}
		}
        return ns
    }
///</function>
,	updateGns : function (doc) {
	//	this.extractNS(doc.documentElement.outerHTML).forEach(function(it){ G_ns[it.prefix]=it.key;});
		this.findAllNS(doc).forEach(function(it){ this.G_ns[it.prefix]=it.key;});
	}
,	gNSlist : function ( nslist ) {
		var ns = []
		,	nslist = nslist || this.G_ns;
		for(var k in nslist) {
			ns.push( {alias:"", generated:true, prefix:k, key: nslist[k]} );
		}
		return ns;
	}
,	findAllNS : function (element, nslist) {
		var self = this
		,	nslist = nslist || [];
	/* nslist item structure example:
		{	alias: ""
			generated: false
			key: "http://www.w3.org/1999/xhtml"
			prefix: "default"
		}
	*/
		function alreadyInNS( prefix, url ) {
			for (var i=0; i< nslist.length; i++) {
				if (url == nslist[i].key) {
					if (prefix !== undefined) {
						if (prefix != nslist[i].prefix) {
//	console.log("Namespaces duplicate prefix: "+prefix+" | "+url+" |:| "+nslist[i].prefix+" | "+nslist[i].key );	//potential overwrite
						}
					}
					return i;
				}
				if (prefix == nslist[i].prefix) {	// nslist[i].prefix cannot be undefined !
					if (url != nslist[i].key) {
	console.log("Namespaces confict: "+prefix+" | "+url+" |:| "+nslist[i].prefix+" | "+nslist[i].key );	//potential overwrite
					}
					return i;
				}
			}
			return false;
		}
		function addNS(url, prefix) {
			var gen = false
			,	already  = alreadyInNS(prefix, url)
			;
	//		nslist[url] = prefix;

			if (already !== false) {
				return;	// nothing to do, we have assigned namespace
			}
			if (prefix === undefined) {	//assign prefix from alphabet, which is not already used
				prefix = self.alfabetNSprefix(nslist);
				gen = true;
			}
			nslist.push({
				prefix: prefix,
				key: url,
				generated: gen
			,	alias: ""
			});
		}
		function getNSfromNode(nn) {
	/* akykolvek element (tag), resp. atribut ma nejake namespace
	pokial namespace prefix je explicitne definovany, napr. 
		element:		svg:g, xsl:value-of, kres:x ....
						xxx    xxx           xxxx 
		atribut:		xmlns:ng="http://angularjs.org"
							  xx
	vratim presny prefix, inak vratim undefined
	*/
			var ns, nnArr = nn.split(":");
			if (nnArr.length > 1) { ns = nnArr[0].toLowerCase() == "xmlns" ? nnArr[1] : nnArr[0]; }
			return ns;
		}
		
		if (element.namespaceURI) {
			addNS(element.namespaceURI, getNSfromNode(element.nodeName));	//nslist[element.namespaceURI] = getNSfromNode(element.nodeName);
		}
		if (element.attributes) {
			for(var i=0; i < element.attributes.length; i++) {
				var attEl = element.attributes[i];
				var xmlnsrgx = /\s*xmlns(?::(.*)\s*$)*/
				,	match = attEl.nodeName.match(xmlnsrgx)
				;
	// if attribute === 'xmlns', itself is in another namespace, that defines, so use only its value 
				if (match) {
					addNS(attEl.nodeValue, match[1]);	//nslist[attEl.nodeValue] = match[1];
				} else if (attEl.namespaceURI) {
					addNS(attEl.namespaceURI, getNSfromNode(attEl.nodeName));	//nslist[attEl.namespaceURI] = getNSfromNode(attEl.nodeName);
				}
			}
		}
		if (element.childNodes) {
			for(var i=0; i < element.childNodes.length; i++) {
				this.findAllNS (element.childNodes[i], nslist)
			}
		}
		return nslist;
	}
,	genResolverFnc : function (nslist) {
		var ns = [];
		nslist.forEach(function(it){ ns[it.prefix]=it.key;});
		return function(prefix) {
			return ns[prefix] || null;
		}
	}
,	doXPathQuery: function (doc, query, count, callback) {
		if (! doc) {
			return;	// undefined
		}
	//	query .... 		//object with own defaults overwrites
	//	....
	// ,xpathExpression : .... 
	// ,contextNode : element, 
	// ,namespaceResolver : function(prefix) { return prefix ? 'http://www.w3.org/1999/xhtml' : null; }, 
	// ,resultType : [  ANY_TYPE	//0	Whatever type naturally results from the given expression.
	//				,NUMBER_TYPE	//1	A result set containing a single number. Useful, for example, in an XPath expression using the count() function.
	//				,STRING_TYPE	//2	A result set containing a single string.
	//				,BOOLEAN_TYPE	//3	A result set containing a single boolean value. Useful, for example, an an XPath expression using the not() function.
	//				,UNORDERED_NODE_ITERATOR_TYPE	//4	A result set containing all the nodes matching the expression. The nodes in the result set are not necessarily in the same order they appear in the document.
	//				,ORDERED_NODE_ITERATOR_TYPE		//5	A result set containing all the nodes matching the expression. The nodes in the result set are in the same order they appear in the document.
	//				,UNORDERED_NODE_SNAPSHOT_TYPE	//6	A result set containing snapshots of all the nodes matching the expression. The nodes in the result set are not necessarily in the same order they appear in the document.
	//				,ORDERED_NODE_SNAPSHOT_TYPE		//7	A result set containing snapshots of all the nodes matching the expression. The nodes in the result set are in the same order they appear in the document.
	//				,ANY_UNORDERED_NODE_TYPE		//8	A result set containing any single node that matches the expression. The node is not necessarily the first node in the document that matches the expression.
	//				,FIRST_ORDERED_NODE_TYPE		//9	A result set containing the first node in the document that matches the expression.
	//			][7]
	// , ...
	//

		//IE ... too much problems with XML docs, ... wait while be modern and normative compliant ....
		//maybe  Wicked Good XPath:
		if (! doc.evaluate ) {
			wgxpath.setTo(doc);
		}
		if (doc.evaluate && query) { 
			var  count = count || (( typeof query.count != "undefined" ) ? query.count : 0)		//default all finded
				,contextNode 		= ( typeof query.contextNode != "undefined" ) ? query.contextNode : doc
				,resultType  		= ( typeof query.resultType != "undefined" ) ? query.resultType : XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
				,namespaceResolver  = ( typeof query.namespaceResolver != "undefined" ) ? query.namespaceResolver : this.nsResolverFnc
				,xquery = (typeof query == "string") ? query : (
						  (typeof query.xpathExpression != "undefined") ? query.xpathExpression : "//*"		//default find all nodes
						)
				,xNodeList
				,callback = callback || (( typeof query.callback != "undefined" ) ? query.callback : undefined)	
				,isCall = (typeof(callback) === "function")
				,clen, o, oarr=[]
				, i=0
				;
			try {
				xNodeList = doc.evaluate (xquery,	contextNode,	namespaceResolver,	resultType,	null);
			} catch(e) { xNodeList = null; }
			if (xNodeList) { 
				switch(xNodeList.resultType) {
					case XPathResult.NUMBER_TYPE :
						o = xNodeList.numberValue;		isCall && callback(o, i, doc, xquery, count, xNodeList.resultType); 
						return xNodeList.numberValue;
					case XPathResult.STRING_TYPE :
						o = xNodeList.stringValue;		isCall && callback(o, i, doc, xquery, count, xNodeList.resultType); 
						return xNodeList.stringValue;
					case XPathResult.BOOLEAN_TYPE :
						o = xNodeList.booleanValue;		isCall && callback(o, i, doc, xquery, count, xNodeList.resultType); 
						return xNodeList.booleanValue;
					case XPathResult.UNORDERED_NODE_ITERATOR_TYPE :
					case XPathResult.ORDERED_NODE_ITERATOR_TYPE :
							clen = 0;
							do {
								if ((count > 0) && (clen >= count) || ! (o = xNodeList.iterateNext()) ) { 
									break;
								}
								isCall && callback(o, i, doc, xquery, count, xNodeList.resultType); 
								i++;
								oarr.push(o);
							} while(true);
							if (count == 1) { return oarr[0]; }	//xNodeList.snapshotItem(0)
							else { return oarr; }	//xNodeList ... is complicated;
					case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE :
					case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE :
					case XPathResult.ANY_UNORDERED_NODE_TYPE :
					case XPathResult.FIRST_ORDERED_NODE_TYPE :
						var len = xNodeList.snapshotLength;
						if (len > 0) {
							clen = ((count > 0) && (len > count)) ? count : len;
							for (var i=0; i< clen; i++) {
								o = xNodeList.snapshotItem(i);
								if (isCall) {
									callback(o, i, doc, xquery, count, xNodeList.resultType); //primarilly I want to do something with object and his index, but who need, has input parameterss too
								}	//maybe callback in future will return someway "transformated" object/reference    passed to returned array
								oarr.push(o);
							}
							if (count == 1) { return oarr[0]; }	//xNodeList.snapshotItem(0)
							else { return oarr; }	//xNodeList ... is complicated;
						}
						break;
				}
			}
		}
		return null;
	}
  }
  
  glob.XXX = XXX;
  glob.X = new XXX();
  
})( this );
//]]></script>

//<script id="jsXSLTer" type="text/javascript">//<![CDATA[

// ==UserScript==
// @name Pretty XML tree
// @author Jakub Roztocil <jakub@roztocil.name>
// @version 0.6
// @ujs:published 2008-06-23
// @ujs:updated 2009-09-21
// @ujs:download http://www.webkitchen.cz/lab/opera/pretty-xml-tree/files/pretty-xml-tree.js
// @ujs:documentation http://blog.webkitchen.cz/pretty-xml-tree
// ==/UserScript==

/*
CHANGELOG

1.0	- prerobil com vsetko na univerzalnejsi CLASS

0.6 - improved display of comments, monospace font

0.5 - hide XML tree generated by Opera 10 (thx BigMike)

0.4 - fixed missing "/" in closing tags

0.3 - added a check whether document is a WML document (thx arjanm)
    - fixed conflict with anchorize.js

*/

(function( glob ) {		//CLASS stylerXML
/*	CLASS stylerXML
 *	@description	style xmlDoc(ument) with xslt(styles)Sheet and put it to domElem(ent)
 *	@param	xmlDoc		XML document, or XML string 
 *	@param	xsltSheet	XML (stylesheet) document, or XSLT string 
 *	@param	domElem		HTML element, whose innerHTML is filled by conversion result
*/
	function stylerXML ( xmlDoc, xsltSheet, domElem ) { 
		if (!(this instanceof stylerXML)) {
			return new stylerXML( xmlDoc, xslSheet, domElem );
		}
		this.setup( xmlDoc, xsltSheet, domElem );
//				xmlDoc = (new DOMParser).parseFromString(response, "application/xml");		
	}
	stylerXML.prototype = {	
		setup: function( xmlDoc, xsltSheet, domElem ) {
			var el;
// TODO: if isURI ... XHR load
			if ( ! xmlDoc ) {
				// if argument not provided, let your previous value in action
			} else if (xmlDoc instanceof Document) {
				this.xmlDoc = xmlDoc; 
			} else if (el = gID(xmlDoc)){
				this.xmlDoc = this.str2doc(el.innerHTML);
			} else {
				this.xmlDoc = this.str2doc(xmlDoc);
			}
			if ( ! xsltSheet ) {
				// if argument not provided, let your previous value in action
			} else if (xsltSheet instanceof Document) {
				this.xsltSheet = xsltSheet; 
			} else if (el = gID(xsltSheet)){
				this.xsltSheet = this.str2doc(el.innerHTML);
			} else {
				this.xsltSheet = this.str2doc(xsltSheet);
			}
			if ( ! domElem ) {
				// if argument not provided, let your previous value in action
			} else {
				this.domElem = gID(domElem);	//auto identifies DOMElement
			}
		}
	,	doc2str: function( doc ) {
			if (doc instanceof Document) {
				return new XMLSerializer().serializeToString(doc);
			}
			return "";
		}
	,	str2doc: function( xmltxt ) {
// v podstate konvertuje vsetko bez exception - chybny dokument obsahuje 'html > body > parsererror', resp. 'xml > parsererror'
//netreba ani try - catch
		//	try {
				var xmldoc =  (new DOMParser).parseFromString(xmltxt, "application/xml");		
				if (xmldoc.querySelectorAll('xml > parsererror').length || xmldoc.querySelectorAll('html > body > parsererror').length)	{
					return null;
				}
	sID("base64decode",this.doc2str(xsI.xmlDoc));
					//convert all base64 encoded string to readable string:
				X.doXPathQuery(xmldoc, '//*[@encoding="base64"]',0,		//			/text()', 0,  
					function (oo, i, doc, query) {
						oo.textContent = atob(oo.textContent);
					}
				);
				return xmldoc;
		//	} catch( e ) {
		//		return null;
		//	}
		}
	,	create: function( setterFnc ) {
/* main conversion function ... xml -> xslt -> dom
	accepted fillMethod values: see sID function
*/
			var processor = new XSLTProcessor();
			processor.importStylesheet(this.xsltSheet);	//getStylesheet());
			processor.setParameter(null, 'xml-declaration', this.getXmlDeclaration());
			processor.setParameter(null, 'doctype', this.getDoctype());
			//document.replaceChild(processor.transformToDocument(document).documentElement, document.documentElement);

/* XSLT transformaciou generovany document -> documentElement potrebujem umiestnit do hlavnej HTML stranky
v roznych formach, zavislych od commnad-u, ktorym som dokument ziskal
	source ... textarea.value -> editor.setValue(textarea.value)
	get_context ... div innerHTML
	...

//	http://debeissat.nicolas.free.fr/xsl_tests.php

function createDocumentFromText(text) {
    // code for IE
    if (window.ActiveXObject) {
        var doc=new ActiveXObject("Microsoft.XMLDOM");
        doc.async="false";
        doc.loadXML(text);
    }
    // code for Mozilla, Firefox, Opera, etc.
    else {
        var parser=new DOMParser();
        var doc=parser.parseFromString(text,"text/xml");
    }
    return doc;
}

function innerXML(node) {
    if (node.innerXML) {
        return node.innerXML;
    } else {
        if (node.xml) {
            return node.xml;
        } else {
            if (typeof XMLSerializer != "undefined") {
                var serializer = new XMLSerializer();
                return serializer.serializeToString(node);
            }
        }
    }
}

  		function tranform(xmlId, xslId, resultId) {
			var xml = document.getElementById(xmlId).value;
			xml = createDocumentFromText(xml);
			var xsl = document.getElementById(xslId).value;
			xsl = createDocumentFromText(xsl);
			var result;
			// code for IE
		    if (window.ActiveXObject) {
		        result = xml.transformNode(xsl);
		    }
		    // code for Mozilla, Firefox, Opera, etc.
		    else if (document.implementation && document.implementation.createDocument) {
		        var xsltProcessor = new XSLTProcessor();
		        xsltProcessor.importStylesheet(xsl);
		        result = xsltProcessor.transformToFragment(xml,document);
		    }
			result = innerXML(result);
			result = result.replace(/></g,">\n<");
			document.getElementById(resultId).value = result;
		}
*/

// transformToDocument dokaze crash-nut page, transformToFragment vrati len NULL ? NIE ... problem aj tak !!!!
			//var traEl = processor.transformToFragment(this.xmlDoc,document);	
			var traEl = processor.transformToDocument(this.xmlDoc);
	//		,	elDoc = this.domElem.ownerDocument
	//		,	elPar = this.domElem.parentNode
			;
			if ( ! traEl) {
				console.log (" PROBLEM XSLT transformToFragment !");
			} else {
				if (typeof setterFnc == "function") {
					setterFnc(traEl, this);
				} else { // default HTML setter function ... replace first child element
					if (this.domElem) {
						if (this.domElem.firstElementChild) {
							this.domElem.replaceChild(traEl.documentElement, this.domElem.firstElementChild);
						} else {
							this.domElem.appendChild(traEl.documentElement);
						}
						this.init();
					}
				}
			}
		}
	,	init: function () {
			function higlight() {
				this.parentNode.className += ' tag-hover';
			}
			function unhiglight() {
				this.parentNode.className = this.parentNode.className.replace('tag-hover', '');
			}
			function toggle() {
				if (this.parentNode.className.indexOf('closed') > -1) {
					this.parentNode.className =  this.parentNode.className.replace('closed', '');
				} else {
					this.parentNode.className += ' closed';
				}
			}
			var result = document.evaluate("//*[contains(@class, 'tag-start') or  contains(@class, 'tag-end')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
			var node, i = 0;
			while (node = result.snapshotItem(i++)) {
				node.onmouseover = higlight;
				node.onmouseout = unhiglight;
				node.onclick = toggle;
			}
			if (typeof ResizableColumns != "undefined")	{
				ResizableColumns();
			}
		}
	,	getDoctype: function() {
			var xdocu = this.xmlDoc;
			var dt = '';
			if (xdocu.doctype) {
				var dt = '<!DOCTYPE ' + xdocu.doctype.name;
				if (xdocu.doctype.publicId) {
					dt += ' "' + xdocu.doctype.publicId + '"';
				}
				if (xdocu.doctype.systemId) {
					dt += ' "' + xdocu.doctype.systemId + '"';
				}
				if (xdocu.doctype.internalSubset) {
					dt += ' [' + xdocu.doctype.internalSubset + ']';
				}
				dt += '>';
			}
			return dt;
		}
	,	getXmlDeclaration: function() {
			var xdocu = this.xmlDoc;
			var xmlDecl = new XMLSerializer().serializeToString(xdocu).match(/^(\s*)(<\?xml.+?\?>)/i);
			return xmlDecl[2];
		}
	,	getStylesheet: function() {
			if (this.xsltSheet) {
				return new DOMParser().parseFromString(this.xsltSheet, "text/xml");
			} else {
				// for testing
				var request = new XMLHttpRequest();
				request.open('GET', 'pretty-xml-tree.xsl?' + (new Date().getTime()), false);
				request.send(null);
				return request.responseXML;
			}
		}
		//	,	xslt: '<?xml version="1.0" encoding="utf-8"?> <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns="http://www.w3.org/1999/xhtml" version="1.0"> <xsl:output encoding="utf-8" method="xml" indent="no" doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"/> <xsl:param name="doctype"/> <xsl:param name="xml-declaration"/> <xsl:template match="/"> <html> <head> <style type="text/css"> div.header {display:none;} div.syntax {display:none;} body, html { margin: 0; padding: 0; font: 12px/1.5 Consolas, monospace; } #info { background: #ccc; border-bottom: 3px solid #000; padding: 1em; margin-bottom: 2em; } #xml-declaration { font-weight: bold; } #doctype { font-weight: bold; color: green; margin: 0; } #tree { font: 13px/1.2 monospace; padding-left: .4em; } .ele { margin: 2px 0 5px; border-left: 1px dotted #fff; } .ele .ele, .ele .comment { margin-left: 40px } .content { display: inline; } div.inline, div.inline * { display: inline; margin: 0; border-left: none; } .name, .prefix { color: purple; font-weight: bold; } .a-value { color: blue; } .a-name { font-weight: bold; } .comment { color: green; font-style: italic; white-space: pre; } .text { white-space: pre; color: #484848; } .pi { color: orange; font-weight: bold; } .tag { color: #000; } .tag-start, .tag-end { cursor: pointer; } .tag-hover > .tag:last-child, .tag-hover > .tag:first-child { background: #eee; } .tag-hover { border-left-style: solid; border-left-color: #ccc; } .closed > .content { display: none; } .closed > .tag-start:after { content: \'...\'; background: lime; } </style> </head> <body> <div id="info"> <p>This XML file does not appear to have any style information associated with it. The document tree is shown below.</p> </div> <div id="tree"> <div id="xml-declaration"> <xsl:value-of select="$xml-declaration"/> </div> <xsl:apply-templates select="processing-instruction()" /> <xsl:if test="$doctype"> <pre id="doctype"> <xsl:value-of select="$doctype"/> </pre> </xsl:if> <xsl:apply-templates select="node()[not(self::processing-instruction())]" /> </div> </body> </html> </xsl:template> <xsl:template match="a[@class = \'x-opera-anchorized\']"> <!-- Un-anchorize when anchorize.js installed --> <xsl:apply-templates select="text()"/> </xsl:template> <xsl:template match="*"> <div class="ele"> <xsl:if test="(preceding-sibling::text()[normalize-space(.)] or following-sibling::text()[normalize-space(.)]) and not(*)"> <xsl:attribute name="class"> <xsl:text> inline</xsl:text> </xsl:attribute> </xsl:if> <xsl:if test="namespace-uri(.)"> <xsl:attribute name="title"> <xsl:value-of select="namespace-uri(.)"/> </xsl:attribute> </xsl:if> <xsl:variable name="tag"> <xsl:if test="contains(name(.), \':\')"> <span class="prefix"> <xsl:value-of select="substring-before(name(.), \':\')"/> </span> <xsl:text>:</xsl:text> </xsl:if> <span class="name"> <xsl:value-of select="local-name(.)"/> </span> </xsl:variable> <span id="start-{generate-id(.)}"> <xsl:attribute name="class"> <xsl:text>tag tag-</xsl:text> <xsl:choose> <xsl:when test="node()">start</xsl:when> <xsl:otherwise>self-close</xsl:otherwise> </xsl:choose> </xsl:attribute> <xsl:text>&lt;</xsl:text> <xsl:copy-of select="$tag"/> <xsl:apply-templates select="@*"/> <xsl:if test="not(node())"> <xsl:text> /</xsl:text> </xsl:if> <xsl:text>&gt;</xsl:text> </span> <xsl:if test="node()"> <div class="content"> <xsl:apply-templates /> </div> <span class="tag tag-end" id="end-{generate-id(.)}"> <xsl:text>&lt;/</xsl:text> <xsl:copy-of select="$tag"/> <xsl:text>&gt;</xsl:text> </span> </xsl:if> </div> </xsl:template> <xsl:template match="@*"> <xsl:text> </xsl:text> <span class="a-name"> <xsl:value-of select="name(.)"/> </span> <xsl:text>=</xsl:text> <span class="a-value"> <xsl:value-of select="concat(\'&quot;\', ., \'&quot;\')"/> </span> </xsl:template> <xsl:template match="text()"> <xsl:if test="normalize-space(.)"> <span class="text"> <xsl:value-of select="."/> </span> </xsl:if> </xsl:template> <xsl:template match="comment()"> <div class="comment"> <xsl:text>&lt;--</xsl:text> <xsl:value-of select="."/> <xsl:text>--&gt;</xsl:text> </div> </xsl:template> <xsl:template match="processing-instruction()"> <div class="pi"> <xsl:text>&lt;?</xsl:text> <xsl:value-of select="name(.)"/> <xsl:text> </xsl:text> <xsl:value-of select="."/> <xsl:text>?&gt;</xsl:text> </div> </xsl:template> </xsl:stylesheet>'
	,	check : function() {
			var xdocu = this.xmlDoc;
			return /*if*/ ((xdocu.styleSheets.length && xdocu.documentElement.tagName != 'xsl:stylesheet')
				|| xdocu.documentElement.tagName == 'html'
				|| xdocu.documentElement.tagName == 'wml'
				|| !xdocu.documentElement
				|| !(xdocu instanceof XMLDocument))
			;
		}
	}
	glob.stylerXML = stylerXML;
/*	example:
//	tX = new stylerXML( loadedXMLdoc, loadedXSLstylesheet, elementHTMLdivToFill);
//	tX.create();
*/
	
})( this );

//]]></script>


///<function name="queryXpath" type="prototype method">
Element.prototype.queryXpath = function( query, callback, count ) {
	if (! query) {
		return null;
	}
	if (! query.xpathExpression) {
		query = {
			xpathExpression : query
		}
	}
	if (count) {
		query.count = count;
	}
	if (callback) {
		query.callback = callback;
	}
/*# nakolko prisne chcem, aby queryXpath bolo relativne voci vlastnemu contextNode,
potrebujem prekonat vlastnost XPath v suvislosti s '//' na zaciatku,
ktore aby bolo relativne, treba prepisat na './/'
Samozrejme v pripade komplikovanych XPath vyrazov, ako 
//* | //div 
mam smolu (bez zloziteho analyzovania XPath)
TAKZE otazka znie ... paprat sa s tym, resp. ocakavat znalosti od uzivatela - programatora ? 
ROZHODNUTIE : ... moze sa stat, ze niekto naozaj bude chciet hladat v celom dokumente,
nezavisle na relativnej forme ... a v takom pripade by toto pozadove 'relativizovanie'
robilo PROBLEM
RADSEJ NECH SA NAUCI XPATH !!
*/
/*
	if (query.xpathExpression.match("^\/\/")) {
		query.xpathExpression = '.'+query.xpathExpression
	}
*/
	query.contextNode = this;
	return X.doXPathQuery( this.ownerDocument, query );
}
///</function>

///<property name="directText" of="Element.prototype" type="prototype method getter">
Object.defineProperty(Element.prototype, 'directText', {
  get: function() {
	var txt = ''; 
	this.queryXpath('text()',function(o){txt+=o.textContent}); 
	return txt;
  }
});
///</property>
