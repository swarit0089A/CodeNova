const { STRIVER_PRACTICE_CATALOG } = require('../data/striverPracticeCatalog');

async function seedPracticeProblems(db) {
  const problemCollection = db.collection('problems');
  const existingProblems = await problemCollection.find({}).toArray();
  const existingTitles = new Set(existingProblems.map((problem) => problem.title));

  let inserted = 0;

  for (const problem of STRIVER_PRACTICE_CATALOG) {
    if (existingTitles.has(problem.title)) {
      continue;
    }

    await problemCollection.insertOne(problem);
    inserted += 1;
  }

  return {
    inserted,
    totalCatalogSize: STRIVER_PRACTICE_CATALOG.length,
  };
}

module.exports = {
  seedPracticeProblems,
};
