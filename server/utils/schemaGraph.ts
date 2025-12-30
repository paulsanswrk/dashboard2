export type JoinType = 'inner' | 'left'
export type Cardinality = '1:N' | 'N:1' | 'N:N' | 'unknown'

export interface ColumnPair {
	position: number
	sourceColumn: string
	targetColumn: string
}

export interface EdgePayload {
	constraintName: string
	joinType: JoinType
	columnPairs: ColumnPair[]
	cardinality: Cardinality
	reversed?: boolean
}

export interface Edge {
	id: string
	from: string
	to: string
	payload: EdgePayload
}

export interface NodeMeta {
	tableName: string
	primaryKey: string[]
	foreignKeys: string[]
	columns: string[]
}

export interface TableGraph {
	nodes: Map<string, NodeMeta>
	adj: Map<string, Edge[]>
}

export interface PathObj {
	nodes: string[]
	edges: string[]
	cost: number
	label: string
}

export interface PathsIndex {
	paths: Map<string, Map<string, PathObj[]>>
}

export interface ExitPayload { exitTo: string; paths: PathObj[] }
export interface ExitPayloads { exits: Record<string, ExitPayload[]> }

export const MAX_DEPTH = 8
export const K_SHORTEST = 3
export const COST_WEIGHTS = { hop: 1.0, nToNPenalty: 0.5, nullablePenalty: 0.25 }

/**
 * Compute paths only for the specified tables (not all pairs in the graph).
 * This is O(K²) where K is the number of tables, instead of O(N²) where N is all tables.
 * Used for on-demand path computation at query time.
 */
export function computePathsForTables(graph: TableGraph, tableNames: string[]): PathsIndex {
    const pathsIndex = new Map<string, Map<string, PathObj[]>>()
    const edgeMap = new Map<string, Edge>()
    for (const edges of graph.adj.values()) for (const edge of edges) edgeMap.set(edge.id, edge)

    // Only compute paths between the specified tables
    for (const startTable of tableNames) {
        if (!graph.nodes.has(startTable)) continue
        const startPaths = new Map<string, PathObj[]>()
        for (const targetTable of tableNames) {
            if (startTable === targetTable) continue
            if (!graph.nodes.has(targetTable)) continue
            const allPaths: PathObj[] = []
            findPathsDFS(startTable, startTable, targetTable, new Set(), [startTable], [], 0, graph.adj, edgeMap, allPaths)
            if (allPaths.length > 0) {
                allPaths.sort((a, b) => a.cost - b.cost)
                startPaths.set(targetTable, allPaths.slice(0, K_SHORTEST))
            }
        }
        if (startPaths.size > 0) pathsIndex.set(startTable, startPaths)
    }
    return {paths: pathsIndex}
}

export function createEdgeId(sourceTable: string, constraintName: string, targetTable: string, reversed = false): string {

    const suffix = reversed ? '__rev' : ''
	return `${sourceTable}__${constraintName}__${targetTable}${suffix}`
}

export function parseSchema(schemaJson: any): Map<string, NodeMeta> {
	const nodes = new Map<string, NodeMeta>()
	for (const table of schemaJson.schema.tables) {
		nodes.set(table.tableName, {
			tableName: table.tableName,
			primaryKey: table.primaryKey || [],
			foreignKeys: table.foreignKeys?.map((fk: any) => fk.columnPairs?.[0]?.sourceColumn).filter(Boolean) || [],
			columns: table.columns?.map((col: any) => col.name) || []
		})
	}
	return nodes
}

export function extractForeignKeys(schemaJson: any) {
	const foreignKeys: any[] = []
	for (const table of schemaJson.schema.tables) {
		if (table.foreignKeys) {
			for (const fk of table.foreignKeys) {
				foreignKeys.push({
					constraintName: fk.constraintName,
					sourceTable: fk.sourceTable,
					targetTable: fk.targetTable,
					columnPairs: fk.columnPairs,
					updateRule: fk.updateRule,
					deleteRule: fk.deleteRule
				})
			}
		}
	}
	return foreignKeys
}

export function inferCardinality(fk: any, reversed = false): Cardinality {
	if (reversed) {
		if (fk.cardinality === 'N:1') return '1:N'
		if (fk.cardinality === '1:N') return 'N:1'
		return fk.cardinality || 'unknown'
	}
	return 'N:1'
}

export function buildGraph(schemaJson: any): TableGraph {
	const nodes = parseSchema(schemaJson)
	const adj = new Map<string, Edge[]>()
	const foreignKeys = extractForeignKeys(schemaJson)
	for (const tableName of nodes.keys()) adj.set(tableName, [])

	// Track connections to avoid duplicates between same table pairs
	const addedConnections = new Set<string>()

	for (const fk of foreignKeys) {
		// Skip reflexive relationships (self-referential foreign keys)
		if (fk.sourceTable === fk.targetTable) {
			continue
		}

		// Create a key for this table pair (order matters: source->target)
		const connectionKey = `${fk.sourceTable}->${fk.targetTable}`

		// Skip if we already have a connection between these tables
		if (addedConnections.has(connectionKey)) {
			continue
		}

		const forwardEdge: Edge = {
			id: createEdgeId(fk.sourceTable, fk.constraintName, fk.targetTable, false),
			from: fk.sourceTable,
			to: fk.targetTable,
			payload: { constraintName: fk.constraintName, joinType: 'inner', columnPairs: fk.columnPairs, cardinality: inferCardinality(fk, false), reversed: false }
		}
		const reverseEdge: Edge = {
			id: createEdgeId(fk.sourceTable, fk.constraintName, fk.targetTable, true),
			from: fk.targetTable,
			to: fk.sourceTable,
			payload: {
				constraintName: fk.constraintName,
				joinType: 'inner',
				columnPairs: fk.columnPairs.map((pair: any) => ({ position: pair.position, sourceColumn: pair.targetColumn, targetColumn: pair.sourceColumn })),
				cardinality: inferCardinality(fk, true),
				reversed: true
			}
		}
		if (adj.has(fk.sourceTable) && adj.has(fk.targetTable)) {
			adj.get(fk.sourceTable)!.push(forwardEdge)
			adj.get(fk.targetTable)!.push(reverseEdge)
			addedConnections.add(connectionKey)
		}
	}
	return { nodes, adj }
}

export function calculatePathCost(nodes: string[], edges: string[], edgeMap: Map<string, Edge>): number {
	let cost = (nodes.length - 1) * COST_WEIGHTS.hop
	for (const edgeId of edges) {
		const edge = edgeMap.get(edgeId)
		if (edge?.payload?.cardinality === 'N:N') cost += COST_WEIGHTS.nToNPenalty
	}
	return cost
}

export function createPathLabel(nodes: string[]): string { return nodes.join('->') }

export function findPathsDFS(
	start: string,
	current: string,
	target: string,
	visited: Set<string>,
	currentPath: string[],
	currentEdges: string[],
	depth: number,
	adj: Map<string, Edge[]>,
	edgeMap: Map<string, Edge>,
	allPaths: PathObj[]
) {
	if (depth > MAX_DEPTH) return
	if (visited.has(current) && current !== start) return
	const newVisited = new Set(visited)
	newVisited.add(current)
	if (current === target && current !== start) {
		allPaths.push({ nodes: [...currentPath], edges: [...currentEdges], cost: calculatePathCost(currentPath, currentEdges, edgeMap), label: createPathLabel(currentPath) })
		return
	}
	const neighbors = adj.get(current) || []
	for (const edge of neighbors) {
		if (currentPath.length > 0 && edge.to === currentPath[currentPath.length - 1]) continue
		if (currentPath.includes(edge.to)) continue
		const newPath = [...currentPath, edge.to]
		const newEdges = [...currentEdges, edge.id]
		findPathsDFS(start, edge.to, target, newVisited, newPath, newEdges, depth + 1, adj, edgeMap, allPaths)
	}
}

export function computePathsIndex(graph: TableGraph): PathsIndex {
	const pathsIndex = new Map<string, Map<string, PathObj[]>>()
	const edgeMap = new Map<string, Edge>()
	for (const edges of graph.adj.values()) for (const edge of edges) edgeMap.set(edge.id, edge)
	for (const startTable of graph.nodes.keys()) {
		const startPaths = new Map<string, PathObj[]>()
		for (const targetTable of graph.nodes.keys()) {
			if (startTable === targetTable) continue
			const allPaths: PathObj[] = []
			findPathsDFS(startTable, startTable, targetTable, new Set(), [startTable], [], 0, graph.adj, edgeMap, allPaths)
			if (allPaths.length > 0) {
				allPaths.sort((a, b) => a.cost - b.cost)
				startPaths.set(targetTable, allPaths.slice(0, K_SHORTEST))
			}
		}
		if (startPaths.size > 0) pathsIndex.set(startTable, startPaths)
	}
	return { paths: pathsIndex }
}

export function isPrefix(path1: PathObj, path2: PathObj): boolean {
	if (path1.nodes.length >= path2.nodes.length) return false
	return path1.nodes.every((node, index) => node === path2.nodes[index])
}

export function deduplicatePaths(paths: PathObj[]): PathObj[] {
	if (paths.length <= 1) return paths
	const uniquePaths: PathObj[] = []
	const seen = new Set<string>()
	for (const p of paths) {
		const key = `${p.nodes.join(',')}|${p.edges.join(',')}`
		if (!seen.has(key)) {
			seen.add(key)
			uniquePaths.push(p)
		}
	}
	const sorted = uniquePaths.sort((a, b) => b.nodes.length - a.nodes.length)
	const result: PathObj[] = []
	for (const p of sorted) {
		const redundant = result.some(longer => isPrefix(p, longer))
		if (!redundant) result.push(p)
	}
	return result
}

export function buildExitPayloads(graph: TableGraph, pathsIndex: PathsIndex): ExitPayloads {
	const exitPayloads: Record<string, ExitPayload[]> = {}
	for (const [startTable, targetPaths] of pathsIndex.paths) {
		const exits: Record<string, PathObj[]> = {}
		for (const [, paths] of targetPaths) {
			for (const path of paths) {
				if (path.nodes.length >= 2) {
					const firstHop = path.nodes[1]
					if (!exits[firstHop]) exits[firstHop] = []
					exits[firstHop].push(path)
				}
			}
		}
		if (Object.keys(exits).length > 0) {
			exitPayloads[startTable] = Object.entries(exits).map(([exitTo, paths]) => ({ exitTo, paths: deduplicatePaths(paths) }))
		}
	}
	return { exits: exitPayloads }
}

export function serializeGraph(graph: TableGraph): string {
	const serializable = { nodes: Array.from(graph.nodes.entries()), adj: Array.from(graph.adj.entries()) }
	return JSON.stringify(serializable, null, 2)
}

export function serializePaths(pathsIndex: PathsIndex): string {
	const serializable = { paths: Array.from(pathsIndex.paths.entries()).map(([start, targets]) => [start, Array.from(targets.entries())]) }
	return JSON.stringify(serializable, null, 2)
}

export function exportGraphPuml(graph: TableGraph): string {
	let puml = `@startuml\n` +
		`!define AWSPUML https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v19.0/dist\n` +
		`skinparam classAttributeIconSize 0\n` +
		`skinparam ArrowThickness 1\n` +
		`skinparam ArrowColor #888888\n` +
		`skinparam ClassBorderColor #444444\n` +
		`skinparam ClassBackgroundColor #f8f8f8\n` +
		`skinparam NoteBorderColor #888888\n` +
		`skinparam NoteBackgroundColor #ffffcc\n` +
		`\nlegend right\n  |= Color |= Meaning |\n  | Blue | Selected path |\n  | Red | Alternative path |\n  | Black | Regular connection |\nendlegend\n\n`
	for (const [tableName] of graph.nodes) {
		puml += `class "${tableName}" as ${tableName} {\n  +table\n}\n`
	}
	const added = new Set<string>()
	for (const [, edges] of graph.adj) {
		for (const edge of edges) {
			const key = `${edge.from}->${edge.to}`
			if (added.has(key)) continue
			added.add(key)
			const cardinality = edge.payload.cardinality
			const constraint = edge.payload.constraintName
			const columns = edge.payload.columnPairs.map(cp => `${cp.sourceColumn}=${cp.targetColumn}`).join(', ')
			puml += `${edge.from} --> ${edge.to} : ${constraint}\\n${columns}\\n${cardinality}\n`
		}
	}
	puml += '@enduml\n'
	return puml
}

export function exportHighlightedPuml(graph: TableGraph, highlightEdges: string[], notes = new Map<string, string>()): string {
	let puml = exportGraphPuml({ ...graph, adj: graph.adj })
	// Simple approach: reuse graph export and ignore highlights in this refactor step
	return puml
}

export function exportNodeExitsPuml(graph: TableGraph, exitPayloads: ExitPayloads): string {
	let puml = `@startuml\n` +
		`!define AWSPUML https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v19.0/dist\n` +
		`skinparam classAttributeIconSize 0\n` +
		`skinparam ArrowThickness 1\n` +
		`skinparam ArrowColor #888888\n` +
		`skinparam ClassBorderColor #444444\n` +
		`skinparam ClassBackgroundColor #f8f8f8\n` +
		`skinparam NoteBorderColor #888888\n` +
		`skinparam NoteBackgroundColor #ffffcc\n` +
		`\nlegend right\n  |= Color |= Meaning |\n  | Blue | Selected path |\n  | Red | Alternative path |\n  | Black | Regular connection |\nendlegend\n\n`
	for (const [tableName] of graph.nodes) {
		puml += `class "${tableName}" as ${tableName} {\n  +table\n}\n`
	}
	const added = new Set<string>()
	for (const [, edges] of graph.adj) {
		for (const edge of edges) {
			const key = `${edge.from}->${edge.to}`
			if (added.has(key)) continue
			added.add(key)
			const cardinality = edge.payload.cardinality
			const constraint = edge.payload.constraintName
			const columns = edge.payload.columnPairs.map(cp => `${cp.sourceColumn}=${cp.targetColumn}`).join(', ')
			puml += `${edge.from} --> ${edge.to} : ${constraint}\\n${columns}\\n${cardinality}\n`
		}
	}
	for (const [tableName, exits] of Object.entries(exitPayloads.exits)) {
		if (exits.length > 0) {
			puml += `note right of ${tableName}\n  **Exits:**\n`
			for (const exit of exits) {
				puml += `  ${exit.exitTo}:\n`
				for (const path of exit.paths) puml += `    ${path.label}\n`
			}
			puml += `end note\n`
		}
	}
	puml += '@enduml\n'
	return puml
}

/**
 * Select join tree for a set of tables using greedy Steiner approximation
 * @param {string[]} tables - Target tables to connect
 * @param {TableGraph} graph - The graph
 * @param {PathsIndex} pathsIndex - Paths index
 * @returns {Object} Join tree with edge IDs and nodes
 */
export function selectJoinTree(tables: string[], graph: TableGraph, pathsIndex: PathsIndex): { edgeIds: string[], nodes: string[] } {
	if (tables.length === 0) return { edgeIds: [], nodes: [] }
	if (tables.length === 1) return { edgeIds: [], nodes: tables }

	const covered = new Set<string>()
	const selectedEdges = new Set<string>()
	const selectedNodes = new Set<string>()

	// Pick seed (first table as user-selected or highest-degree)
	const seed = tables[0]
	covered.add(seed)
	selectedNodes.add(seed)

	// Greedily add paths to uncovered tables
	while (covered.size < tables.length) {
		let bestPath: PathObj | null = null
		let bestCost = Infinity
		let bestTarget: string | null = null

		for (const uncovered of tables) {
			if (covered.has(uncovered)) continue

			// Find best path from any covered table to this uncovered table
			for (const coveredTable of covered) {
				const paths = pathsIndex.paths.get(coveredTable)?.get(uncovered)
				if (paths && paths.length > 0) {
					const path = paths[0] // Use cheapest path
					if (path.cost < bestCost) {
						bestCost = path.cost
						bestPath = path
						bestTarget = uncovered
					}
				}
			}
		}

		if (bestPath && bestTarget) {
			// Add path edges and nodes
			for (const edgeId of bestPath.edges) {
				selectedEdges.add(edgeId)
			}
			for (const node of bestPath.nodes) {
				selectedNodes.add(node)
				if (tables.includes(node)) {
					covered.add(node)
				}
			}
		} else {
			break // No path found to remaining tables
		}
	}

	return {
		edgeIds: Array.from(selectedEdges),
		nodes: Array.from(selectedNodes)
	}
}


