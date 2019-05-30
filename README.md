# Aeon-Backend

This is the backend server implementation for the Aeon system. Must be used in
conjunction with the frontend web application.

## Installation

Requires Node v8.9.4 and Npm v6.9.0 to be installed.

Run `npm install` to install dependencies.

git clone ACVTool from https://github.com/DennisTsiang/acvtool and place in a folder called vendor

git clone Orka from https://github.com/DennisTsiang/orka and place in vendor folder too.

Create a PostgreSQL database and populate it with tables corresponding to the
categories you want. Example table schema can be found in `create_tables.sh`.

Modify file `.env` to the correct locations for your machine.


## Usage
Run `node server.js` to deploy server locally.
