const crypto = require('crypto');
const { readFile, writeFile } = require('fs/promises');
const { accessSync, writeFileSync } = require('fs');

// access or create the json file containing the documents uploaded
const repository = () => {
  try {
    accessSync('files.json');
  } catch (e) {
    writeFileSync('files.json', '[]');
  }
};

// read the existing files inside the json
const getExistingRecords = async () => {
  return JSON.parse(await readFile('files.json', { encoding: 'utf8' }));
};

// validate incoming file names
const validateFilenames = (newFiles, existingRecords) => {
  const filenameErrors = [];
  const fileNames = existingRecords.map((rec) => rec.file.originalname);
  newFiles.forEach((file) => {
    if (fileNames.includes(file.originalname)) {
      filenameErrors.push(file.originalname);
    }
  });

  const validFiles = newFiles.filter(
    (file) => !filenameErrors.includes(file.originalname)
  );

  return { validFiles, filenameErrors };
};

// create object for each uploaded file
const prepareFiles = (files) => {
  const newRecords = files.map((file) => {
    return {
      file: file,
      timestamp: Date.now(),
      id: crypto.randomBytes(15).toString('hex'),
    };
  });
  return newRecords;
};

// update json
const updateRecords = async (records) => {
  const data = JSON.stringify(records, null, 2);
  await writeFile('files.json', data);
};

module.exports = {
  repository,
  getExistingRecords,
  validateFilenames,
  prepareFiles,
  updateRecords,
};
