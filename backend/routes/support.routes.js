const express = require("express");

const router = express.Router();

router.get("/site-photos", (req, res) => {
  res.json([]);
});

router.delete("/site-photos/:id", (req, res) => {
  res.json({
    message: "Foto eliminada temporalmente",
  });
});

router.post("/audit-logs", (req, res) => {
  console.log("Audit local:", req.body);

  res.status(201).json({
    id: Date.now(),
    ...req.body,
  });
});

module.exports = router;