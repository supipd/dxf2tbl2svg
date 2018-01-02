# dxf2tbl2svg
convert AutoCAD DXF file to tables and subsequently to SVG

I tried using  online DXF to SVG converter, but I was not satisfied with result, because text were converted to paths, 
that's why they were not directly readable in SVG code and DOM elements.

Dashed lines were converted to SVG paths too, that's why they lost precision of start and end points.

After trying to convert DXF to SVG by C++ suorce code repository DXF2SVG, I had a lot of problems with debugging.

So I decided to create my own DXF to TABLES to SVG converter in pure Javascript ... and here is.

API
----
todo

Usage
-----
see dxf2tbl2svg.xhtml ... select local DXF file to convert ... everything else is automated.

Case Study which used this converter:
http://213.151.245.228/TERIX/ZBM/uM_CaseStudy_eng.xhtml

TODO
----
todo

(WIP Work In Progress)

