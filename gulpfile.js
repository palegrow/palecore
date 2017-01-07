'use strict';

const browserSync = require('browser-sync').create();
const bundleBuilder = require('gulp-bem-bundle-builder');
const bundlerFs = require('gulp-bem-bundler-fs');
const concat = require('gulp-concat');
const csso = require('gulp-csso');
const debug = require('gulp-debug');
const del = require('del');
const flatten = require('gulp-flatten');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const imagemin = require('gulp-imagemin');
const include = require('gulp-include');
const notify = require('gulp-notify');
const nunjucks = require('gulp-nunjucks-html');
const postcss = require('gulp-postcss');
const posthtml = require('gulp-posthtml');
const sourcemaps = require('gulp-sourcemaps');
const typograf = require('gulp-typograf');
const uglify = require('gulp-uglify');

// TODO:
// Версионирование
// Кеширование
// Линтеры


const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';
const DEST = 'dist';

const builder = bundleBuilder({
  levels: [
    'node_modules/pale-blocks/blocks',
    'node_modules/pale-blocks/design/blocks',
    'blocks'
  ],
  techMap: {
    css: ['post.css', 'css'],
    js: ['js']
  }
});

gulp.task('bemCss', function() {
  return bundlerFs('bundles/*')
    .pipe(builder({
      css: bundle => bundle.src('css')
        .pipe(gulpIf(isDevelopment, sourcemaps.init()))
        .pipe(postcss([
          require('postcss-import')(),
          require('postcss-for'),
          require('postcss-simple-vars')(),
          require('postcss-calc')(),
          require('postcss-nested'),
          require('postcss-color-function'),
          require('postcss-url')({
            url: 'inline',
            maxSize: 0,
            fallback: 'copy',
            assetsPath: 'assets'
          }),
          require('autoprefixer')(),
          require('postcss-reporter')()
        ], {
          to: DEST + '/' + bundle.name + '.css',
        })).on('error', notify.onError(function(err) {
          return {
            title: 'PostCSS',
            message: err.message,
            sound: 'Blow'
          };
        }))
        .pipe(concat(bundle.name + '.css'))
        .pipe(gulpIf(isDevelopment, sourcemaps.write('.')))
        .pipe(gulpIf(!isDevelopment, csso()))
    }))
    .pipe(debug({title: 'buildCss:'}))
    .pipe(gulp.dest(DEST));
});

gulp.task('bemJs', function() {
  return bundlerFs('bundles/*')
    .pipe(builder({
      js: bundle => bundle.src('js')
        .pipe(gulpIf(isDevelopment, sourcemaps.init()))
        .pipe(include({
          includePaths: [
            __dirname + '/node_modules',
            __dirname + '/.'
          ]
        }))
        .pipe(concat(bundle.name + '.js'))
        .pipe(gulpIf(isDevelopment, sourcemaps.write('.')))
        .pipe(gulpIf(!isDevelopment, uglify()))
    }))
    .pipe(debug({title: 'buildJs:'}))
    .pipe(gulp.dest(DEST));
});

gulp.task('clean', function() {
  return del(DEST+'/*');
});

gulp.task('buildHtml', function() {
  return gulp.src('pages/**/*.html')
    .pipe(nunjucks({
      searchPaths: ['./']
    })).on('error', notify.onError(function(err) {
      return {
        title: 'Nunjucks',
        message: err.message,
        sound: 'Blow'
      };
    }))
    .pipe(typograf({
      lang: 'ru',
      mode: 'digit'
    }))
    .pipe(gulpIf(!isDevelopment, posthtml([
      require('posthtml-alt-always')(),
      require('posthtml-minifier')({
        removeComments: true,
        collapseWhitespace: true,
        minifyJS: true
      })
    ])))
    .pipe(flatten())
    .pipe(debug({title: 'buildHtml:'}))
    .pipe(gulp.dest(DEST));
});

gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('bemCss', 'bemJs', 'buildHtml')
));

gulp.task('watch', function() {
  gulp.watch([
    'blocks/**/*.deps.js',
    'bundles/**/*.bemdecl.js'
  ], gulp.parallel('bemCss', 'bemJs'));

  gulp.watch([
    'pages/**/*.html',
    'templates/**/*.html'
  ], gulp.series('buildHtml'));

  gulp.watch('blocks/**/*.css', gulp.series('bemCss'));

  gulp.watch('blocks/**/*.js', gulp.series('bemJs'));
});

gulp.task('serve', function() {
  browserSync.init({
    logPrefix: 'palecore',
    server: DEST,
    port: isDevelopment ? 3000 : 8080,
    notify: false,
    open: false,
    ui: false,
    tunnel: false,
  });

  browserSync.watch([
    DEST+'/**/*.*',
    '!'+DEST+'/**/*.+(css|css.map)'
  ]).on('change', browserSync.reload);

  browserSync.watch(DEST+'/**/*.css', function (event, file) {
    if (event === 'change') {
      browserSync.reload(DEST+'/**/*.css');
    }
  });
});

gulp.task('dev', gulp.series('build', gulp.parallel('watch', 'serve')));
gulp.task('prod', gulp.series('build', 'serve'));

gulp.task('default', gulp.series(isDevelopment ? 'dev' : 'prod'));
