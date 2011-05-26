# Use bundler to pull all the gems needed for building and testing.
require 'rubygems'
require 'bundler'
begin
  Bundler.setup
rescue Bundler::BundlerError => e
  $stderr.puts e.message
  $stderr.puts "Run `bundle install` to install missing gems"
  exit e.status_code
end
require 'fileutils'
require 'rake'

# Output directory.
directory 'bin'

# Vendored sjcl.
file 'vendor/sjcl' do
  Dir.chdir 'vendor' do
    Kernel.system 'git clone https://github.com/bitwiseshiftleft/sjcl.git'
  end
end
file 'vendor/sjcl.min.js' => 'vendor/sjcl' do
  Dir.chdir 'vendor/sjcl' do
    Kernel.system './configure --without-all --with-sha1 --with-sha256 --with-codecHex'
    Kernel.system 'make'
  end
  FileUtils.cp 'vendor/sjcl/sjcl.js', 'vendor/sjcl.min.js'
end

# Development binaries.
file 'bin/filer.js' => Dir['src/filer/*.js'].sort do
  Kernel.system 'cat src/filer/*.js  > bin/filer.js'
end
file 'bin/filer.js' => ['bin']
file 'bin/filer-worker.js' => Dir['src/filer-worker/*.js'].sort do
  Kernel.system 'cat src/filer-worker/*.js  > bin/filer-worker.js'
end
file 'bin/filer-worker.js' => ['bin']

# Production binaries.
file 'bin/filer.min.js' => ['bin/filer.js', 'vendor/sjcl.min.js']  do
  Kernel.system 'juicer merge --force bin/filer.js'
  merged_binary = File.read('bin/filer.min.js') +
                  File.read('vendor/sjcl.min.js')
  File.open('bin/filer.min.js', 'w') { |f| f.write merged_binary }
end
file 'bin/filer-worker.min.js' => 'bin/filer-worker.js' do
  Kernel.system 'juicer merge --force bin/filer-worker.js'
end

# Build tasks.
task :build => ['bin/filer.min.js', 'bin/filer-worker.min.js']
task :default => [:build, :large_files]

# Generate files for the upload test.
require 'fileutils'
[1, 10, 100, 1000].each do |megs|
  file "test/files/blank_#{megs}.bin" do
    FileUtils.mkdir_p 'test/files'
    size = megs * 1024 * 1024
    File.open("test/files/blank_#{megs}.bin", 'wb') do |f|
      megs.times do |i|
        megabyte = [i].pack('C') * (1024 * 1024)
        f.write megabyte
      end
    end
  end
  task :large_files => "test/files/blank_#{megs}.bin"
end

desc 'Launch the test Sinatra backend'
task :server do
  Kernel.system 'shotgun test/server.rb'
end
