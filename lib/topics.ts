
export const categories = [
  "Fundamentals",
  "Distributed Systems",
  "Databases",
  "Caching",
  "Message Queues",
  "System Design Problems",
];

export const topics = [
  {
    title: "Scalability",
    slug: "scalability",
    category: "Fundamentals",
    description: "Understand how systems handle increasing workloads.",
    content: "Scalability is the ability of a system to handle increasing workloads by adding resources."
  },
  {
    title: "CAP Theorem",
    slug: "cap-theorem",
    category: "Fundamentals",
    description: "Understand consistency, availability and partition tolerance.",
    content: "The CAP theorem describes trade-offs between consistency, availability and partition tolerance in distributed systems."
  },
  {
    title: "SQL vs NoSQL",
    slug: "sql-vs-nosql",
    category: "Databases",
    description: "Compare relational and non-relational databases.",
    content: "SQL databases use relational tables and structured schemas. NoSQL databases support different data models and flexible schemas."
  },
  {
    title: "Database Indexing",
    slug: "database-indexing",
    category: "Databases",
    description: "Learn how indexes improve database query performance.",
    content: "A database index is a data structure that helps the database find records faster without scanning every row."
  },
  {
    title: "Database Replication",
    slug: "database-replication",
    category: "Databases",
    description: "Understand how database copies improve availability.",
    content: "Database replication maintains copies of data across multiple database servers."
  },
  {
    title: "Database Sharding",
    slug: "database-sharding",
    category: "Databases",
    description: "Learn how to distribute data across multiple databases.",
    content: "Sharding partitions a database into smaller pieces distributed across multiple servers."
  },
  {
    title: "Cache-Aside Pattern",
    slug: "cache-aside",
    category: "Caching",
    description: "Explore one of the most common caching strategies.",
    content: "In the cache-aside pattern, the application checks the cache first and fetches data from the database on a cache miss."
  },
  {
    title: "Apache Kafka",
    slug: "apache-kafka",
    category: "Message Queues",
    description: "Understand distributed event streaming.",
    content: "Apache Kafka is a distributed event streaming platform used to publish, store and consume event streams."
  },
  {
    title: "Design YouTube",
    slug: "design-youtube",
    category: "System Design Problems",
    description: "Design a scalable video streaming platform.",
    content: "A YouTube-like system needs video uploads, transcoding, object storage, CDN delivery and metadata management."
  },
  {
    title: "Design WhatsApp",
    slug: "design-whatsapp",
    category: "System Design Problems",
    description: "Design a real-time messaging application.",
    content: "A WhatsApp-like system needs message delivery, persistent storage, online presence and media handling."
  },
];
