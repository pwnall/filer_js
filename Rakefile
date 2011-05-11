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
require 'rake'


# Output directory.
directory 'bin'

# Development binary.
file 'bin/filer.js' => Dir['vendor/crypto/*.js'].sort + Dir['/src/filer/*.js'].sort do
  Kernel.system 'cat vendor/crypto/*.js src/filer/*.js  > bin/filer.js'
end

# Production binaries.
file 'bin/filer.min.js' => 'bin/filer.js' do
  Kernel.system 'juicer merge --force bin/filer.js'
end

# Build tasks.
task :build => ['bin/filer.min.js']
task :default => [:generate, :build]

# Generate files for the upload test.
require 'fileutils'
task 'test/files/blank_1.bin', 'test/files/blank_1000.bin' do
  FileUtils.mkdir_p 'test/files'
  [1, 10, 100, 1000].each do |megs|
    size = megs * 1024 * 1024
    File.open("test/files/blank_#{megs}.bin", 'wb') do |f|
      megs.times do |i|
        megabyte = [i].pack('C') * (1024 * 1024)
        f.write megabyte
      end
    end
  end
end
task :generate => ['test/files/blank_1.bin', 'test/files/blank_1000.bin']

task :default => :generate

task :server do
  Kernel.system 'shotgun test/server.rb'
end
