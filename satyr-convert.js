/* Compiles a Satyr project file into a set of files usable from RGBDS ASM */

let path = require('path')
let fs = require('fs')

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

function decodeString(buf, index, len) {
	let s = ''
	for (let i = index; i < index + len; i++) s += String.fromCharCode(buf[i] & 0xFF)
	return s
}

fs.readFile(srcPath, (err, a) => {
	if (err) throw err

	let VERSION = 1
	let MODES = { GBC: 0 }
	let DATA_FLAGS = { EXPORT: 1 }

	let bin = []
	let inc = ''

	let projectName = ""
	let projectMode = MODES.GBC

	let i = 0
	let len = 0
	let count = 0

	// header
	let version = a[i++]
	if (version != VERSION) {
		console.error('Project version not supported; expected ' + VERSION + ' but got ' + version + '. You may need a newer version of this script. Aborting')
		process.exit(1)
	}
	len = a[i++]
	projectName = decodeString(a, i, len)
	i += len
	projectMode = a[i++]
	if (projectMode != MODES.GBC) {
		console.error('Project mode not supported. You may need a newer version of this script. Aborting')
		process.exit(1)
	}

	// read rest of project here

	inc += ';\n'
	inc += '; Auto-generated file; any changes will be overwritten\n'
	inc += '; Exported from Satyr project "' + projectName + '"\n'
	inc += ';\n'

	// export rest of project here

	fs.writeFile(binPath, Buffer.from(bin), err => {
		if (err) throw err
	})
	fs.writeFile(incPath, inc, 'utf8', err => {
		if (err) throw err
	})
})