/*
|--------------------------------------------------------------------------
| JavaScript entrypoint for running ace commands
|--------------------------------------------------------------------------
|
| DO NOT MODIFY THIS FILE as it will be overwritten during
| the build process.
|
*/
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
await import('./bin/console.js')
