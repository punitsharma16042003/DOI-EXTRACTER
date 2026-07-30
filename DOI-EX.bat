@echo off
title DOI EX — Bibliography DOI Extractor
set "LOCATION=%~dp0index.html"
set "LOCATION=%LOCATION:\=/%"
start msedge --app="file:///%LOCATION%" --window-size=1280,850
