// npm run build

const fs = require('fs');
const htmlMinify = require('html-minifier').minify;
const jsMinify = require('node-minify');
const zip = new require('node-zip')();
const chalk = require('chalk');

main();

function main() {
    console.log(chalk.blue('Start building...'));

    clear();

    buildHtml();
    buildJs();

    runZip();

    afterBuild();
}

function clear() {
    ['./dist', './tmp'].forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmdirSync(dir, {recursive: true});
        }
        fs.mkdirSync(dir);
    });
}

function buildHtml() {
    let htmlSrc = fs.readFileSync('./index.html', 'utf-8');

    // Replace with CDN
    htmlSrc = htmlSrc.replace(
        './node_modules/three/build/three.js',
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r120/three.min.js'
    );

    [
        '<script src="./node_modules/stats.js/build/stats.min.js"></script>',
        '<script src="./node_modules/dat.gui/build/dat.gui.js"></script>'
    ].forEach(txt => {
        htmlSrc = htmlSrc.replace(txt, '');
    });

    const htmlDist = htmlMinify(htmlSrc, {
    //   removeAttributeQuotes: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeEmptyElements: true,
      removeOptionalTags: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      minifyCSS: true,
      collapseWhitespace: true
    });

    fs.writeFileSync('./dist/index.html', htmlDist);
}

function buildJs() {
    const indexSrc = fs.readFileSync('./index.js', 'utf-8');

    // Remove debug
    let indexContent = '';
    const indexLines = indexSrc.split('\n');
    let isDebug = false;
    for (let i = 0; i < indexLines.length; ++i) {
        if (!isDebug && indexLines[i].indexOf('// DEBUG') > -1) {
            isDebug = true;
        }
        else if (isDebug && indexLines[i].indexOf('// DEBUG END') > -1) {
            isDebug = false;
        }
        else if (!isDebug) {
            indexContent += indexLines[i] + '\n';
        }
    }

    // Write to tmp
    fs.writeFileSync('./tmp/index.js', indexContent);

    // gcc, terser, babel-minify
    jsMinify.minify({
        compressor: 'terser',
        input: './tmp/index.js',
        output: './dist/index.js'
    });
}

function runZip() {
    zip.file('index.html', fs.readFileSync('./dist/index.html'));
    zip.file('index.js', fs.readFileSync('./dist/index.js'));

    const data = zip.generate({
        base64: false,
        compression: 'DEFLATE'
    });

    fs.writeFileSync('./dist/alien.zip', data, 'binary');

    const size = fs.statSync('./dist/alien.zip').size;
    let sizeStr;
    if (size > 1024 * 1024) {
        sizeStr = Math.round(size / 1024 / 1024 * 10) / 10 + ' MB';
    }
    else if (size > 1024) {
        sizeStr = Math.round(size / 1024 * 10) / 10 + ' KB';
    }
    else {
        sizeStr = size + ' B';
    }

    let sizeColor;
    if (size < 7 * 1024) {
        sizeColor = chalk.green;
    }
    else if (size < 10 * 1024) {
        sizeColor = chalk.yellow;
    }
    else if (size < 13 * 1024) {
        sizeColor = chalk.orange;
    }
    else {
        sizeColor = chalk.red;
    }

    console.log(chalk.cyan('Build complete. Zipped size: ')
        + sizeColor.bold(sizeStr));
}

function afterBuild() {
    const dir = 'tmp';
    if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, {recursive: true});
    }
    fs.mkdirSync(dir);
}