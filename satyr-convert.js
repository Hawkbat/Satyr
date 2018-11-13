/* Compiles a Satyr project file into a set of files usable from RGBDS ASM */

let path = require('path')
let fs = require('fs')
let convertProject = require('./convert.js')

let args = process.argv.slice(2)

let srcPath = ''
let binPath = ''
let incPath = ''

for (let i = 0; i < args.length; i++) {
	if (args[i] == '-o' || args[i] == '--out') {
		binPath = args[++i]
	} else if (args[i] == '-i' || args[i] == '--inc') {
		incPath = args[++i]
	} else {
		srcPath = args[i]
	}
}
if (srcPath)
	srcPath = path.resolve(process.cwd(), srcPath)
else {
	console.error('No source project specified, aborting')
	process.exit(1)
}

if (binPath)
	binPath = path.resolve(process.cwd(), binPath)
else
	binPath = path.join(path.dirname(srcPath), path.basename(srcPath, path.extname(srcPath)) + '.bin')

if (incPath)
	incPath = path.resolve(process.cwd(), incPath)
else
	incPath = path.join(path.dirname(binPath), path.basename(binPath, path.extname(binPath)) + '.inc')

fs.readFile(srcPath, (err, a) => {
	if (err) throw err

	let { error, inc, bin } = convertProject(a, path.basename(binPath))
	if (error) {
		console.error(error)
		process.exit(-1)
	}

	fs.writeFile(binPath, Buffer.from(bin), err => {
		if (err) throw err
	})
	fs.writeFile(incPath, inc, 'utf8', err => {
		if (err) throw err
	})
})