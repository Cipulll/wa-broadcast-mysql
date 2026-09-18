const express = require('express');
const router = express.Router();
const waService = require('../whatsapp');
const verifyToken = require('../middleware/auth');

// Get WA Connection Status & QR Code (Terproteksi JWT)
router.get('/status', verifyToken, (req, res) => {
    res.json({
        status: waService.getStatus(),
        qr: waService.getQR()
    });
});

module.exports = router;