const LANGUAGE_CONFIG = {
  cpp: {
    extension: 'cpp',
    docker: {
      imageName: 'codearena_cpp_docker',
      entryPoint: 'g++ main.cpp -o main && timeout 6s ./main',
    },
  },
  py: {
    extension: 'py',
    docker: {
      imageName: 'codearena_python_docker',
      entryPoint: 'timeout 6s python main.py',
    },
  },
  js: {
    extension: 'js',
  },
  cs: {
    extension: 'cs',
  },
  java: {
    extension: 'java',
  },
};

function getLanguageConfig(language) {
  return LANGUAGE_CONFIG[language] || null;
}

function getLanguageExtension(language) {
  return getLanguageConfig(language)?.extension || language;
}

function isDockerLanguage(language) {
  return Boolean(getLanguageConfig(language)?.docker);
}

module.exports = {
  getLanguageConfig,
  getLanguageExtension,
  isDockerLanguage,
};
