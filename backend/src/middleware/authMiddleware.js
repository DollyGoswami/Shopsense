const passport = require("passport");

/**
 * Protect routes — requires valid JWT token.
 * Usage: router.get("/profile", protect, handler)
 */
const protect = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err)    return next(err);
    if (!user)  return res.status(401).json({ success: false, message: "Unauthorized — please login" });
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Optional auth — attaches user if token present, continues even if not.
 */
const optionalAuth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

module.exports = { protect, optionalAuth };
