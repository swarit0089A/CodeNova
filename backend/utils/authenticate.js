require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const secret_key = process.env.SECRET_TOKEN || "secret_key";

module.exports = {
  auth: (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        return res.status(403).json({ msg: "Authentication required" });
      }
      const decodedToken = jwt.verify(token, secret_key);
      if (decodedToken && decodedToken.id) {
        return next();
      } else {
        return res.status(403).json({ msg: "Invalid token" });
      }

    } catch (error) {
      return res.status(403).json({ msg: "Invalid token or not authorized" });
    }
  }
};
