/*This is a Jade/Pug syntax checker.
Change the file path at the bottom of this file to point to your .jade file.
If you are using .pug, make a copy as .jade and run the checker against that.
If you are using Brackets, open this file then select Run from the Node.js menu.
If an error is found, it will point to the line in the terminal below.

File courtesy of https://gist.github.com/chowey
*/

var jade = require('jade'),
    runtime = require('jade/lib/runtime'),
    spawn = require('child_process').spawn,
    fs = require('fs');

function parse(str, filename){
  var options = {filename: filename, compileDebug: true};
  try {
    // Parse
    var parser = new jade.Parser(str, filename, options)
      , compiler = new (jade.Compiler)(parser.parse(), options)
      , js = compiler.compile();
    
    return ''
      + 'var buf = [];\n'
      + js;
  } catch (err) {
    parser = parser.context();
    runtime.rethrow(err, parser.filename, parser.lexer.lineno);
  }
}

function checkSyntax(str, filename) {
  var fn, err, lineno;
  
  fn = ['var __jade = [{ lineno: 1, filename: ' + JSON.stringify(filename) + ' }];'
    , parse(str, filename)].join('\n');
  
  var child = spawn(process.execPath, ['-e', fn]);
  
  child.stderr.setEncoding('utf8');
  
  child.stderr.on('data', function (data) {
    var errLines = data.split('\n'),
        descLine = errLines[4];
    
    if (/^SyntaxError: /.test(descLine)) {
      // Syntax error was found
      var infoLine = errLines[1].split(':');
      
      fn = fn.split('\n').slice(0, infoLine[1]);
      for (var i = 0; i < fn.length; i++)
        if (!/__jade/.test(fn[i]))
          fn[i] = '';
      fn = fn.join('\n') + '__jade[0].lineno';
      lineno = eval(fn);
      
      err = new SyntaxError(descLine.substr(13));
    }
  });
  
  child.on('exit', function (code, signal) {
    if (err)
      runtime.rethrow(err, filename, lineno);
    else
      console.error('No SyntaxError found');
  });
}

function checkFile(path) {
  fs.readFile(path, 'utf8', function (err, str) {
    if (err) throw err;
    checkSyntax(str, path);
  });
}

//Point to the Jade/Pug file you want to check
checkFile('../app_server/views/layout.jade');