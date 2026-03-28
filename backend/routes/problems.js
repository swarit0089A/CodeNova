const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const databaseProblem = await db.collection('problems').find({}).toArray();
  const orderedProblems = databaseProblem.sort((first, second) => {
    if ((first.rating || 0) === (second.rating || 0)) {
      return first.title.localeCompare(second.title);
    }

    return (first.rating || 0) - (second.rating || 0);
  });

  res.json(orderedProblems);
})

router.get('/:id', async (req, res) => {
  try {
    const selectedProblem = await db.collection('problems').findOne({ title: req.params.id });

    if (!selectedProblem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    return res.status(200).json(selectedProblem);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while fetching the problem.' });
  }
});

module.exports = router;
