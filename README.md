# LOL Patch Comparsion

## Description

It is my project for The Riot Games API Challenge 2.0, topic 2. Showing two list of data for better comparsion between two different patches' matches. Riot patch design is awesome that every items, champions is isolated in different patch. so we can analysis two different patches easier.

## Start Guide

- config API TOKEN in `js/config.js`
- `npm install -g serve` to install serve to host the web
- run `serve` in this root directory to start web server

## Config

- API TOKEN, replace token in `js/config.js`
- PATH & MATCH ID, replace patch version number and match ids in `js/dataset.js`

## Learnt From this project

- lol api design, best practice to database design in my other games
- javascript is not well in data analysis, should use other tools eg: numpy, sql

## To Be Continue

- server for fetch and cache all dataset
- More ap items data analysis.
- D3.js for better visualization.
- python numpy for better data analysis.
- lazy loading for each page.