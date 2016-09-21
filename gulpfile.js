'use strict';

const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gutil = require('gulp-util');
const gulpLoadPlugins = require('gulp-load-plugins');
const wiredep = require('wiredep').stream;
const del = require('del');
const mainBowerFiles = require('main-bower-files');
const injectStr = require('gulp-inject-string');

const g = gulpLoadPlugins();

const SRC_DIR = './src/client';
const DIST_DIR = './public';
const PORT = process.env.NODE_PORT || 3002;

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

let FIREBASE_PROJECT_ID = null;
let FIREBASE_API_KEY = null;
let FIREBASE_MSG_SENDER_ID = null;

const buildWebpackConfig = () => {
  const config = {
    entry: {
      main: path.join(__dirname, SRC_DIR, 'js', 'main.js'),
      sw: path.join(__dirname, SRC_DIR, 'sw.js')
    },
    output: {
      path: path.join(__dirname, 'public', 'js'),
      filename: '[name].js'
    },
    debug : !isProduction,
    module: {
      loaders: [{
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }]
    }
  };

  if (!isProduction) {
    config.devtool = 'eval';
  }

  return config;
};
const webpackConfig = buildWebpackConfig();

gulp.task('clean', () => {
  return del([DIST_DIR]);
});

gulp.task('firebase_config', (cb) => {
  fs.readFile('./README.md', (err, contents) => {
    if (err) {
      return cb(err);
    }
    contents = contents.toString();
    FIREBASE_PROJECT_ID = contents.match(/FIREBASE_PROJECT_ID\:(.*)/)[1].trim();
    FIREBASE_API_KEY = contents.match(/FIREBASE_API_KEY\:(.*)/)[1].trim();
    FIREBASE_MSG_SENDER_ID = contents.match(/FIREBASE_MSG_SENDER_ID\:(.*)/)[1].trim();

    if (process.env.FIREBASE_PROJECT_ID) {
      FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
    }
    if (process.env.FIREBASE_API_KEY) {
      FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    }
    if (process.env.FIREBASE_MSG_SENDER_ID) {
      FIREBASE_MSG_SENDER_ID = process.env.FIREBASE_MSG_SENDER_ID;
    }

    if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
      return cb(new Error('Firebase Project Id and API key not configured!'));
    }
    cb();
  });
});

gulp.task('styles', ['vendor-styles'], () => {
  const injectAppFiles = gulp.src(path.join(SRC_DIR, '/styles/app/**/*.scss'), {
    read: false
  });
  const injectGlobalFiles = gulp.src(path.join(SRC_DIR, '/styles/global/*.scss'), {
    read: false
  });
  const transformFilepath = (filepath) => {
    return `@import "${filepath}";`;
  };
  const injectAppOptions = {
    transform: transformFilepath,
    starttag: '// inject:app',
    endtag: '// endinject',
    addRootSlash: false
  };
  const injectGlobalOptions = {
    transform: transformFilepath,
    starttag: '// inject:global',
    endtag: '// endinject',
    addRootSlash: false
  };

  return gulp.src(path.join(SRC_DIR, '/styles/main.scss'))
    .pipe(wiredep())
    .pipe(g.inject(injectGlobalFiles, injectGlobalOptions))
    .pipe(g.inject(injectAppFiles, injectAppOptions))
    .pipe(g.sass())
    .pipe(g.csso())
    .pipe(gulp.dest(path.join(DIST_DIR, '/styles')));
});

gulp.task('vendor-styles', () => {
  return gulp.src(mainBowerFiles())
    .pipe(g.filter('**/*.css'))
    .pipe(g.concat('vendors.css'))
    .pipe(g.csso())
    .pipe(gulp.dest(path.join(DIST_DIR, '/styles')));
});

gulp.task('vendor-fonts', () => {
  const fontSources = [
    path.join(
      __dirname,
      'bower_components/bootstrap-sass/assets/fonts/**/*'
    )
  ];
  return gulp.src(fontSources)
    .pipe(gulp.dest(path.join(DIST_DIR, '/fonts/')));
});

gulp.task('images', () => {
  return gulp.src(path.join(SRC_DIR, 'images', '**/*'))
    .pipe(gulp.dest(path.join(DIST_DIR, '/images/')));
});

gulp.task('manifests', () => {
  return gulp.src(path.join(SRC_DIR, 'manifest.*'))
    .pipe(injectStr.replace('FIREBASE_MSG_SENDER_ID', FIREBASE_MSG_SENDER_ID))
    .pipe(gulp.dest(path.join(DIST_DIR)));
});

gulp.task('scripts', () => {
  console.log('scripts')
  const entries = Object.keys(webpackConfig.entry).map((key) => {
    return webpackConfig.entry[key];
  });
  return gulp.src(entries)
    .pipe(g.webpack(webpackConfig))
    .pipe(isProduction ? g.uglify() : g.util.noop())
    .pipe(gulp.dest(path.join(DIST_DIR, '/js')));
});

gulp.task('vendor-scripts', () => {
  return gulp.src(mainBowerFiles())
    .pipe(g.filter('**/*.js'))
    .pipe(g.concat('vendor.js'))
    .pipe(isProduction ? g.uglify() : g.util.noop())
    .pipe(gulp.dest(path.join(DIST_DIR, '/js')));
});

gulp.task('build', ['firebase_config', 'styles', 'images', 'scripts', 'manifests', 'vendor-scripts', 'vendor-fonts'], () => {
  const injectFiles = gulp.src([
    path.join(DIST_DIR, '/styles/main.css'),
    path.join(DIST_DIR, '/styles/vendors.css'),
    path.join(DIST_DIR, '/js/vendor.js'),
    path.join(DIST_DIR, '/js/main.js')
  ]);
  const injectOptions = {
    addRootSlash: false,
    ignorePath: ['src', 'public']
  };

  gulp.src(path.join(DIST_DIR, '/js', 'sw.js'))
  .pipe(gulp.dest(path.join(DIST_DIR)));

  return gulp.src(path.join(SRC_DIR, '/index.html'))
    .pipe(g.inject(injectFiles, injectOptions))
    .pipe(injectStr.replace('FIREBASE_API_KEY', FIREBASE_API_KEY))
    .pipe(injectStr.replace('FIREBASE_PROJECT_ID', FIREBASE_PROJECT_ID))
    .pipe(gulp.dest(DIST_DIR));
});

gulp.task('watch', ['default'], () => {
  g.livereload.listen();
  gulp.watch('public/**/*').on('change', g.livereload.changed);
  gulp.watch(path.join(SRC_DIR, '/**/*.*'), ['build']);

  return g.serve({
    root: ['public'],
    port: PORT
  })();
});

//gulp.task('default', ['build']);
gulp.task('default', ['clean', 'firebase_config'], () => {
  gulp.run('build');
});
