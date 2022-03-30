const express = require('express');
const multer = require('multer');
const { unlink } = require('fs/promises');
const {
  repository,
  getExistingRecords,
  prepareFiles,
  updateRecords,
  validateFilenames,
} = require('../utils/helpers');

const router = new express.Router();

// multer configuration
const storage = multer.diskStorage({
  //where to store files
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  // edit filename
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
// create multer middleware
const upload = multer({
  storage,
  // control file size
  limits: {
    fileSize: 5000000,
  },
});

// ROUTES
// upload files
router.post('/upload', upload.array('data'), async (req, res) => {
  if (req.files.length === 0) {
    return res.status(500).send({ message: 'Please upload a file.' });
  }
  try {
    repository();

    const records = await getExistingRecords();

    const { validFiles, filenameErrors } = validateFilenames(
      req.files,
      records
    );

    // handle files with names that already exist
    let successMessage = 'Upload was successful';
    let errorMessage;
    if (filenameErrors.length > 0) {
      successMessage = '';
      errorMessage = `${filenameErrors} not saved. Please change file name and try again.`;
    }

    const newRecords = prepareFiles(validFiles);
    records.push(...newRecords);

    await updateRecords(records);

    res.status(200).send({
      successMessage,
      newRecords,
      errorMessage,
    });
  } catch (e) {
    res.status(503).send(`Service Unavailable: ${e.message}`);
  }
});

// get the most recent file
router.get('/recent', async (req, res) => {
  try {
    const records = await getExistingRecords();
    if (!records) {
      throw new Error('The directory is currently empty');
    }
    // sort files to get the most recent
    const mostRecentRecord = records.sort(
      (a, b) => b.timestamp - a.timestamp
    )[0];

    res.status(200).send(mostRecentRecord);
  } catch (e) {
    res.status(503).send(e.message);
  }
});

// replace file
router.put('/update/:id', upload.single('newdata'), async (req, res) => {
  if (!req.file) {
    return res.status(500).send({ error: 'Please upload a file' });
  }
  try {
    const id = req.params.id;
    const records = await getExistingRecords();

    // check if filename is not used
    const fileNames = records.map((rec) => rec.file.originalname);

    if (fileNames.includes(req.file.originalname)) {
      throw new Error(
        'Please change the name of your file. A file with that name already exists'
      );
    }

    const newRecord = await prepareFiles([req.file]);

    // delete file from directory
    const recordToDelete = records.find((record) => record.id === id);
    if (!recordToDelete) {
      await unlink(req.file.path);
      throw new Error('The file you are trying to replace does not exist');
    }
    await unlink(recordToDelete.file.path);

    // array with the records to keep
    const recordsToKeep = records.filter((record) => record.id !== id);
    recordsToKeep.push(...newRecord);

    await updateRecords(recordsToKeep);

    res.status(200).send('File was successfully replaced');
  } catch (e) {
    res.status(503).send(e.message);
  }
});

// delete file
router.delete('/delete/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const records = await getExistingRecords();

    // delete file from directory
    const recordToDelete = records.find((record) => record.id === id);
    if (!recordToDelete) {
      throw new Error('The file you are trying to delete does not exist');
    }

    await unlink(recordToDelete.file.path);
    // array with the records to keep
    const recordsToKeep = records.filter((record) => record.id !== id);

    await updateRecords(recordsToKeep);

    res
      .status(200)
      .send({ message: 'The file was successfully deleted', recordToDelete });
  } catch (e) {
    res.status(503).send(e.message);
  }
});

module.exports = router;
