# dxf2tbl2svg
convert AutoCAD DXF file to tables and subsequently to SVG

I tried using  online DXF to SVG converter, but I was not satisfied with result, because text were converted to paths, 
that's why they were not directly readable in SVG code and DOM elements.

Dashed lines were converted to SVG paths too, that's why they lost precision of start and end points.

After trying to convert DXF to SVG by C++ source code repository DXF2SVG, I had a lot of problems with debugging.

So I decided to create my own DXF to TABLES to SVG converter in pure Javascript (so higly debuggable) ... and here is.

API
----
todo very soon

Usage
-----
see dxf2tbl2svg.xhtml ... select local DXF file to convert ... everything else is automated.

Converted SVG will be displayed if all is OK.

For viewing created TABLES I recommend browser DevTools or use more featured usage example on following link 

Full featured usage example:
http://www.sbmintegral.sk/TERIX/ZBM/DXF2TBL2SVG/dxf2tbl2svg_full.xhtml

![Help Snapshot](/scans/DXF2TBL2SVG_help.png?raw=true)

Case Study which used this converter:
http://www.sbmintegral.sk//TERIX/ZBM/uM_CaseStudy_eng.xhtml

TODO
----
todo a lot of improvements of DXF analyze


(WIP Work In Progress)

