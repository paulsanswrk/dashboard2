import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
	buildGraph,
	computePathsIndex,
	buildExitPayloads,
	serializeGraph,
	serializePaths,
	exportGraphPuml,
	exportNodeExitsPuml
} from '../server/utils/schemaGraph'

// const schemaPath = path.resolve('node_scripts/db/output/introspection-result.json')
const schemaPath = path.resolve('node_scripts/db/output/introspection-result-insta800.net.json')
const outDir = path.resolve('node_scripts/db/output')
const pumlDir = path.join(outDir, 'puml')

describe('schemaGraph end-to-end', () => {
	it('builds graph, paths, exits and writes outputs matching shapes', async () => {
		const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
        const graph = buildGraph(schema)
        console.log('Graph built:', {
            nodeCount: graph.nodes.size,
            edgeCount: Array.from(graph.adj.values()).flat().length
        })

        const pathsIndex = computePathsIndex(graph)
        console.log('Paths index computed:', {
            startNodeCount: pathsIndex.paths.size,
            totalPaths: Array.from(pathsIndex.paths.values())
                .reduce((sum, targetPaths) => sum + Array.from(targetPaths.values())
                    .reduce((pathSum, paths) => pathSum + paths.length, 0), 0)
        })

        const exits = buildExitPayloads(graph, pathsIndex)
        console.log('Exit payloads built:', {
            exitNodeCount: Object.keys(exits.exits).length,
            totalExitPaths: Object.values(exits.exits)
                .reduce((sum, exitPayloads) => sum + exitPayloads
                    .reduce((pathSum, payload) => pathSum + payload.paths.length, 0), 0)
		})

		// Basic shape assertions
		expect(graph.nodes.size).toBeGreaterThan(0)
		expect(graph.adj.size).toBe(graph.nodes.size)
		expect(pathsIndex.paths.size).toBeGreaterThan(0)
		expect(Object.keys(exits.exits).length).toBeGreaterThan(0)

		// Write outputs
		if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
		if (!fs.existsSync(pumlDir)) fs.mkdirSync(pumlDir, { recursive: true })

		fs.writeFileSync(path.join(outDir, 'connections-graph.json'), serializeGraph(graph))
		fs.writeFileSync(path.join(outDir, 'connections-paths.json'), serializePaths(pathsIndex))
		fs.writeFileSync(path.join(outDir, 'connections-exits.json'), JSON.stringify(exits, null, 2))

		fs.writeFileSync(path.join(pumlDir, 'full-graph.puml'), exportGraphPuml(graph))
		fs.writeFileSync(path.join(pumlDir, 'exits-visualization.puml'), exportNodeExitsPuml(graph, exits))

		// Smoke test contents
		const puml = fs.readFileSync(path.join(pumlDir, 'exits-visualization.puml'), 'utf8')
		expect(puml.startsWith('@startuml')).toBe(true)
		expect(puml.includes('note right of')).toBe(true)
	})
})


