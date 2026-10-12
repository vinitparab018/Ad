const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'public');
const output = path.join(__dirname, '..', 'dist');
const excludedFiles = new Set(['404.html']);
const excludedDirectories = new Set(['admin']);
const excludedScripts = new Set(['admin.js', 'admin-login.js', 'editor.js']);

fs.rmSync(output, {recursive:true,force:true});
fs.mkdirSync(output, {recursive:true});

function copyDirectory(from, to) {
  for (const entry of fs.readdirSync(from, {withFileTypes:true})) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    if (entry.isFile() && excludedFiles.has(entry.name)) continue;
    if (entry.isFile() && path.basename(from) === 'js' && excludedScripts.has(entry.name)) continue;

    const inputPath = path.join(from, entry.name);
    const outputPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(outputPath, {recursive:true});
      copyDirectory(inputPath, outputPath);
      continue;
    }

    let contents = fs.readFileSync(inputPath);
    if (entry.name.endsWith('.html')) {
      let html = contents.toString('utf8').replace(/\b(href|src|action)="\/(?!\/)([^"]*)"/g, (_match, attribute, target) =>
          `${attribute}="${target ? `./${target}` : './'}"`
        );
      if (entry.name === 'index.html') {
        html = html.replace(/<form id="newsletter-form">[\s\S]*?<\/form>/, '<p class="muted">Newsletter signup is not available on this static GitHub Pages demo.</p>');
      }
      if (!html.includes('window.NEWSORBIT_STATIC')) {
        html = html.replace('</head>', '  <script>window.NEWSORBIT_STATIC = true;</script>\n</head>');
      }
      if (!html.includes('ca-pub-8741669636435207')) {
        html = html.replace('</head>', `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8741669636435207"
     crossorigin="anonymous"></script>
</head>`);
      }
      contents = Buffer.from(html);
    }
    fs.mkdirSync(to, {recursive:true});
    fs.writeFileSync(outputPath, contents);
  }
}

copyDirectory(source, output);
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Built GitHub Pages static site at ${output}`);
