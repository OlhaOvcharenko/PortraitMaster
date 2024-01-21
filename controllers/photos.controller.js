const Photo = require('../models/photo.model');
const sanitizeHtml = require('sanitize-html');
const Voter = require('../models/Voter.model');
const requestIp = require('request-ip')

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if (title && author && email && file) {
      // Sanitize user input
      const cleanTitle = sanitizeHtml(title);
      const cleanAuthor = sanitizeHtml(author);

      const allowedFileExtensions = ['gif', 'jpg', 'jpeg', 'png'];
      const fileName = file.path.split('/').slice(-1)[0];
      const fileExt = fileName.split('.').slice(-1)[0];

      const validEmailFormat = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;

      if (!validEmailFormat.test(email)) {
        throw new Error('Invalid email format');
      }
      if (cleanTitle.length > 25) {
        throw new Error('Title length exceeds 25 characters');
      }
      if (cleanAuthor.length > 50) {
        throw new Error('Author name length exceeds 50 characters');
      }
      if (!allowedFileExtensions.includes(fileExt)) {
        throw new Error('Invalid file extension');
      }
      const newPhoto = new Photo({
        title: cleanTitle,
        author: cleanAuthor,
        email,
        src: fileName,
        votes: 0
      });
      
      await newPhoto.save();
      res.json(newPhoto);
    } 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const clientIp = requestIp.getClientIp(req);
    let voter = await Voter.findOne({ user: clientIp });
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });

    if (!voter) {
      const newVoter = new Voter({ user: clientIp, votes: [photoToUpdate._id] });
      await newVoter.save();
      photoToUpdate.votes++;
      await photoToUpdate.save(); 

    } else {

      if (voter.user && voter.votes.includes(photoToUpdate._id)) {
        res.status(400).json({ message: 'Already voted for this photo' });
      } else {
        voter.votes.push(photoToUpdate._id);
        photoToUpdate.votes++;
        await Promise.all([voter.save(), photoToUpdate.save()]); 
        res.send({ message: 'OK' });
      }
    }
  } catch (err) {
    console.error('Error in vote endpoint:', err);
    res.status(500).json({ error: err.message });
  }
};
