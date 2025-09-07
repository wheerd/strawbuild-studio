// Quick debug to understand the shared edge case

const polygon1 = {
  points: [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2]
  ]
}

const polygon2 = {
  points: [
    [2, 0],
    [4, 0],
    [4, 2],
    [2, 2]
  ]
}

function getPolygonEdges(polygon) {
  const edges = []
  const points = polygon.points

  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    edges.push({ start, end })
  }

  return edges
}

const edges1 = getPolygonEdges(polygon1)
const edges2 = getPolygonEdges(polygon2)

console.log('Polygon 1 edges:')
edges1.forEach((edge, i) => {
  console.log(`  ${i}: [${edge.start[0]}, ${edge.start[1]}] -> [${edge.end[0]}, ${edge.end[1]}]`)
})

console.log('Polygon 2 edges:')
edges2.forEach((edge, i) => {
  console.log(`  ${i}: [${edge.start[0]}, ${edge.start[1]}] -> [${edge.end[0]}, ${edge.end[1]}]`)
})

// Look for shared edges
for (let i = 0; i < edges1.length; i++) {
  for (let j = 0; j < edges2.length; j++) {
    const edge1 = edges1[i]
    const edge2 = edges2[j]

    // Check if they share both endpoints
    const startMatchesStart = edge1.start[0] === edge2.start[0] && edge1.start[1] === edge2.start[1]
    const startMatchesEnd = edge1.start[0] === edge2.end[0] && edge1.start[1] === edge2.end[1]
    const endMatchesStart = edge1.end[0] === edge2.start[0] && edge1.end[1] === edge2.start[1]
    const endMatchesEnd = edge1.end[0] === edge2.end[0] && edge1.end[1] === edge2.end[1]

    if ((startMatchesStart && endMatchesEnd) || (startMatchesEnd && endMatchesStart)) {
      console.log(`Found shared edge: Edge ${i} of polygon1 and edge ${j} of polygon2`)
      console.log(`  Edge1: [${edge1.start[0]}, ${edge1.start[1]}] -> [${edge1.end[0]}, ${edge1.end[1]}]`)
      console.log(`  Edge2: [${edge2.start[0]}, ${edge2.start[1]}] -> [${edge2.end[0]}, ${edge2.end[1]}]`)
    }
  }
}
