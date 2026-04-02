/**
 * Passport.js configuration.
 * Strategies: Google OAuth2, JWT
 */
const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/User");

module.exports = (app) => {
  app.use(passport.initialize());

  // ── JWT Strategy ──────────────────────────────────────────────────────────
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey:    process.env.JWT_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await User.findById(payload.id).select("-password");
          if (!user) return done(null, false);
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // ── Google OAuth2 Strategy ────────────────────────────────────────────────
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
        scope:        ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if email already registered (link accounts)
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
            user.avatar   = user.avatar || profile.photos[0]?.value;
            await user.save();
            return done(null, user);
          }

          // Create new user from Google profile
          user = await User.create({
            googleId:    profile.id,
            name:        profile.displayName,
            email:       profile.emails[0].value,
            avatar:      profile.photos[0]?.value,
            isVerified:  true,
            authProvider:"google",
          });

          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );
};
