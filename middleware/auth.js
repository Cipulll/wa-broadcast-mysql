const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Akses ditolak. Token tidak ditemukan!" });
  }

  try {
    const verified = jwt.verify(
      token,
      process.env.JWT_SECRET || "secretkey"
    );
    req.user = verified;
    next();
  } catch (err) {
    res
      .status(403)
      .json({ message: "Token tidak valid atau sudah kadaluwarsa!" });
  }
}

module.exports = verifyToken;