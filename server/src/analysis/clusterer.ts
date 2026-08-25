/**
 * Simple K-Means Clustering for grouping semantically similar prompts.
 * Uses basic cosine distance on pre-computed embeddings.
 */

export interface ClusterResult {
  clusterId: number;
  centroid: number[];
  members: { id: string; embedding: number[]; distance: number }[];
  label: string;
}

/**
 * Cosine distance between two vectors (1 - cosine_similarity).
 */
function cosineDistance(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  return 1 - sim;
}

/**
 * K-Means clustering implementation.
 * @param items - Array of { id, embedding } objects
 * @param k - Number of clusters
 * @param maxIter - Maximum iterations
 */
export function kMeansClustering(
  items: { id: string; embedding: number[] }[],
  k: number,
  maxIter: number = 20
): ClusterResult[] {
  if (items.length === 0) return [];
  
  const dim = items[0].embedding.length;
  
  // Initialize centroids randomly (pick k random items)
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  let centroids = shuffled.slice(0, k).map(it => [...it.embedding]);
  
  let assignments: number[] = new Array(items.length).fill(0);
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each item to nearest centroid
    const newAssignments = items.map(item => {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d = cosineDistance(item.embedding, centroids[c]);
        if (d < minDist) { minDist = d; bestCluster = c; }
      }
      return bestCluster;
    });
    
    // Check convergence
    if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;
    assignments = newAssignments;
    
    // Recompute centroids
    centroids = centroids.map((_, c) => {
      const members = items.filter((_, i) => assignments[i] === c);
      if (members.length === 0) return centroids[c]; // Keep old centroid if empty cluster
      
      const newCentroid = new Array(dim).fill(0);
      members.forEach(m => {
        for (let d = 0; d < dim; d++) newCentroid[d] += m.embedding[d];
      });
      for (let d = 0; d < dim; d++) newCentroid[d] /= members.length;
      return newCentroid;
    });
  }
  
  // Build final clusters
  const clusters: ClusterResult[] = centroids.map((centroid, c) => {
    const members = items
      .filter((_, i) => assignments[i] === c)
      .map(item => ({
        id: item.id,
        embedding: item.embedding,
        distance: cosineDistance(item.embedding, centroid)
      }))
      .sort((a, b) => a.distance - b.distance);

    return {
      clusterId: c,
      centroid,
      members,
      label: `Cluster ${c + 1}` // Will be enhanced by LLM labeling
    };
  });

  return clusters.filter(c => c.members.length > 0);
}

/**
 * Detect anomalies: items whose distance to their nearest centroid exceeds a threshold.
 */
export function detectAnomalies(clusters: ClusterResult[], threshold: number = 0.5): string[] {
  const anomalyIds: string[] = [];
  clusters.forEach(cluster => {
    cluster.members.forEach(m => {
      if (m.distance > threshold) anomalyIds.push(m.id);
    });
  });
  return anomalyIds;
}
