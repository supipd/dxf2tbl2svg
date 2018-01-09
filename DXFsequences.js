///<file name="DXFsequences.js" path="/.../DXFsequences.js" type="javascript">


DXFstructurer = {
/*	common : [
		{ '-1'	:'APP: entity name (changes each time a drawing is opened)' }
	,	{ 0		:'Entity type' }
	,	{ 5		:'Handle' }
	,	{ 102	: { d:'Start of application-defined group'
			, fi: function(gvalue) { return gvalue != '{ACAD_REACTORS' && gvalue != '}' && gvalue != 'ACAD_DICTIONATY'; } 
			, n: 'AppGroup', t : [ { x:'' } 
			]}
		}
	,	{ 102	: { d:'end of group', fi: function(gvalue) { return gvalue == '}'; } }
		}
	,	{ 102	:'indicates the start of the AutoCAD persistent reactors group'
			, fi: function(gvalue) { return gvalue == '{ACAD_REACTORS'; } 
			, c : [ { 330:'Soft-pointer ID/handle to owner dictionary (optional)' } ]
		}
	,	{ 102	:'end of group'
			, fi: function(gvalue) { return gvalue == '}'; } 
		}
	,	{ 102	:'indicates the start of an extension dictionary group'
			, fi: function(gvalue) { return gvalue == '{ACAD_XDICTIONARY”'; } 
			, c : [ { 360:'Hard-owner ID/handle to owner dictionary (optional)' } ]
		}
	,	{ 102	:'end of group'
			, fi: function(gvalue) { return gvalue == '}'; } 
		}
	,	{ 100	:'Subclass marker (AcDbEntity) '
			, fi: function(gvalue) { return gvalue == 'AcDbEntity'; } 
			, c : [ 
				{ 67:'Absent or zero indicates entity is in model space. 1 indicates entity is in 0 paper space (optional).' } 
			,	{ 410:'APP: layout tab name' } 
			,	{ 8:'Layer name' } 
			,	{ 6:'Linetype name (present if not BYLAYER). The special name BYBLOCK indicates a floating linetype (optional) BYLAYER' } 
			]
		}
	]
,	*/
	AcDbHatch : [
	 	{ 100 : { d:"Subclass marker (AcDbHatch)"
				, n:"AcDbHatch", fi: function(gvalue) { return gvalue=='AcDbHatch'; }, t:[
				{	10 : { d:"Elevation point (in OCS) DXF: X value = 0; APP: 3D point (X and Y always equal 0, Z represents the elevation)"
						, n:"Elevation" , t:[
							{	20: "DXF: Y value of elevation point (in OCS)" }
						,	{	30: "DXF: Z value of elevation point (in OCS)" }
						,	{	210: "Extrusion direction (optional; default = 0, 0, 1)" }
						,	{	220: "DXF: Y value of extrusion direction" }
						,	{	230: "DXF: Z value of extrusion direction" }
					]}
				}
			,	{	2 : "Hatch pattern name" }
			,	{	70 : "Solid fill flag (solid fill = 1; pattern fill = 0); for MPolygon, the version of MPolygon" }
			,	{	63 : "For MPolygon, pattern fill color as the ACI" }
			,	{	71 : "Associativity flag (associative = 1; non-associative = 0); for MPolygon, solid-fill flag (has solid fill = 1; lacks solid fill = 0)" }
			,	{	91 : {	d:"Number of boundary paths (loops)"
						,	n:"BoundaryLoops", t:[
	//	Boundary path data. Repeats number of times specified by code 91. See Boundary Path Data
	//	on page 90
	//	varies
							{	92: {	d: "Boundary path type flag (bit coded): 0 = Default; 1 = External; 2 = Polyline 4 = Derived; 8 = Textbox; 16 = Outermost" 
									,	n: 'BoundaryData', fi: function(gvalue) { return gvalue & 2; }, t:[
										{ 72 : "Has bulge flag" }
									,	{ 73 : "Is closed flag" }
									,	{ 93 : "Number of polyline vertices" }
									,	{ 10 : {	d: "Vertex location (in OCS) DXF: X value; APP: 2D point (multiple entries)"
												,	n: "VERTEXES", t:[
													{ 20 : "DXF: Y value of vertex location (in OCS) (multiple entries)" }
												,	{ 42 : "Bulge (optional, default = 0)" }
											]}
										}
								]}
							}
						,	{	92: {	d: "Boundary path type flag (bit coded): 0 = Default; 1 = External; 2 = Polyline 4 = Derived; 8 = Textbox; 16 = Outermost" 
									,	n: 'BoundaryData', fi: function(gvalue) { return (gvalue & 2) == 0; }, t:[
										{ 93 : "Number of edges in this boundary path (only if boundary is not a polyline)" }
									,	{ 72 : {	d: "Edge type (only if boundary is not a polyline): 1 = Line; 2 = Circular arc; 3 = Elliptic arc; 4 = Spline" 
											,	n: "Edge", fi: function(gvalue) { return gvalue == 1; }, t:[
													{ 10 : "Start point (in OCS) DXF: X value; APP: 2D point" }
												,	{ 20 : "DXF: Y value of start point (in OCS)" }
												,	{ 11 : "Endpoint (in OCS) DXF: X value; APP: 2D point" }
												,	{ 21 : "DXF: Y value of endpoint (in OCS)" }
											]} 
										}
									,	{ 72 : {	d: "Edge type (only if boundary is not a polyline): 1 = Line; 2 = Circular arc; 3 = Elliptic arc; 4 = Spline" 
											,	n: "Edge", fi: function(gvalue) { return gvalue == 2; }, t:[
													{ 10 : "Center point (in OCS) DXF: X value; APP: 2D point" }
												,	{ 20 : "DXF: Y value of center point (in OCS)" }
												,	{ 40 : "Radius" }
												,	{ 50 : "Start angle" }
												,	{ 51 : "End angle" }
												,	{ 73 : "Is counterclockwise flag" }
											]} 
										}
									,	{ 72 : {	d: "Edge type (only if boundary is not a polyline): 1 = Line; 2 = Circular arc; 3 = Elliptic arc; 4 = Spline" 
											,	n: "Edge", fi: function(gvalue) { return gvalue == 3; }, t:[
													{ 10 : "Center point (in OCS) DXF: X value; APP: 2D point" }
												,	{ 20 : "DXF: Y value of center point (in OCS)" }
												,	{ 11 : "Endpoint of major axis relative to center point (in OCS) DXF: X value; APP: 2D point" }
												,	{ 21 : "DXF: Y value of endpoint of major axis (in OCS)" }
												,	{ 40 : "Length of minor axis (percentage of major axis length)" }
												,	{ 50 : "Start angle" }
												,	{ 51 : "End angle" }
												,	{ 73 : "Is counterclockwise flag" }
											]} 
										}
									,	{ 72 : {	d: "Edge type (only if boundary is not a polyline): 1 = Line; 2 = Circular arc; 3 = Elliptic arc; 4 = Spline" 
											,	n: "Edge", fi: function(gvalue) { return gvalue == 4; }, t:[
												,	{ 94 : "Degree" }
												,	{ 73 : "Rational" }
												,	{ 74 : "Periodic" }
												,	{ 95 : "Number of knots" }
		// TOD stucturalize SPLINE 										
												,	{ 96 : "Number of control points" }
												,	{ 40 : "Knot values (multiple entries)" }
												,	{ 10 : "Control point (in OCS) DXF: X value; APP: 2D point" }
												,	{ 20 : "DXF: Y value of control point (in OCS)" }
												,	{ 42 : "Weights (optional, default = 1)" }
												,	{ 97 : "Number of fit data" }
												,	{ 11 : "Fit datum (in OCS) DXF: X value; APP: 2D point" }
												,	{ 21 : "DXF: Y value of fit datum (in OCS)" }
												,	{ 12 : "Start tangent DXF: X value; APP: 2D vector" }
												,	{ 22 : "DXF: Y value of start tangent (in OCS)" }
												,	{ 13 : "End tangent DXF: X value; APP: 2D vector" }
												,	{ 23 : "DXF: Y value of end tangent (in OCS)" }
											]} 
										}
								]}
							}
						,	{	97: {	d: "Number of source boundary objects"
									,	n: "SourceBoundaryObjects", t:[
										{ 330 : "Reference to source boundary objects (multiple entries)" }
								]}
							}
					]}
				}
			,	{	75 : "Hatch style: 0 = Hatch “odd parity” area (Normal style) 1 = Hatch outermost area only (Outer style) 2 = Hatch through entire area (Ignore style)" }
			,	{	76 : "Hatch pattern type: 0 = User-defined; 1 = Predefined; 2 = Custom" }
			,	{	52 : "Hatch pattern angle (pattern fill only)" }
			,	{	41 : "Hatch pattern scale or spacing (pattern fill only)" }
			,	{	73 : "For MPolygon, boundary annotation flag (boundary is an annotated boundary = 1; boundary is not an annotated boundary = 0)" }
			,	{	77 : "Hatch pattern double flag (pattern fill only): 0 = not double; 1 = double" }
			,	{	78 : {	d: "Number of pattern definition lines"
						,	n: "PatternDefLines", t:[
	//	varies Pattern line data. Repeats number of times specified by code 78. See Pattern Data on page 94
						{ 53 : "Pattern line angle" }
					,	{ 43 : "Pattern line base point, X component" }
					,	{ 44 : "Pattern line base point, Y component" }
					,	{ 45 : "Pattern line offset, X component" }
					,	{ 46 : "Pattern line offset, Y component" }
					,	{ 79 : "Number of dash length items" }
					,	{ 49 : "Dash length (multiple entries)" }	
					]}
				}
			,	{	47 : "Pixel size used to determine the density to perform various intersection and ray casting operations in hatch pattern computation for associative hatches and hatches created with the Flood method of hatching" }
			,	{	98 : "Number of seed points" }
			,	{	11 : "For MPolygon, offset vector" }
			,	{	99 : "For MPolygon, number of degenerate boundary paths (loops), where a degenerate boundary path is a border that is ignored by the hatch" }
			,	{	10 : {	d:"Seed point (in OCS) DXF: X value; APP: 2D point (multiple entries)"
						,	n:"SeedPoint", t:[
						{ 20: "DXF: Y value of seed point (in OCS); (multiple entries)" }
					]}
				}
			,	{	450 : "Indicates solid hatch or gradient 0 = Solid hatch 1 = Gradient; if solid hatch, the values for the remaining codes are ignored but must be present. Optional; if code 450 is in the file, then the following codes must be in the file: 451, 452, 453, 460, 461, 462, and 470. If code 450 is not in the file, then the following codes must not be in the file: 451, 452, 453, 460, 461, 462, and 470 " }
			,	{	451 : "Zero is reserved for future use" }
			,	{	452 : "Records how colors were defined and is used only by dialog code: 0 = Two-color gradient 1 = Single-color gradient" }
			,	{	453 : "Number of colors: 0 = Solid hatch 2 = Gradient" }
			,	{	460 : "Rotation angle in radians for gradients (default = 0, 0)" }
			,	{	461 : "Gradient definition; corresponds to the Centered option on the Gradient Tab of the Boundary Hatch and Fill dialog box. Each gradient has two definitions, shifted and unshifted. A Shift value describes the blend of the two definitions that should be used. A value of 0.0 means only the unshifted version should be used, and a value of 1.0 means that only the shifted version should be used." }
			,	{	462 : "Color tint value used by dialog code (default = 0, 0; range is 0.0 to 1.0). The color tint value is a gradient color and controls the degree of tint in the dialog when the Hatch group code 452 is set to 1." }
			,	{	463 : "Reserved for future use: 0 = First value 1 = Second value" }
			,	{	470 : "String (default = LINEAR)" }
			]}
		}
	]
}
///</file>