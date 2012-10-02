#!/usr/bin/perl

# This script converts a volkszaehler.org db-dump to rrdtool update statements.
# it expects a db-dump of this format:
#
# id      channel_id      timestamp       value
# 188698  3       1331941304858   0
# ...
#
# It should be easily customizable to work with csv or similar.
#

use strict;
use warnings;

my $last_timestamp = 1337212800; # put the timestamp of your *first* data line here (even though the variable is called $last_timestamp).
my %data = ( 2 => 0, 3 => 0, 4 => 0 ); # the keys (left of the "=>") should be your counter ids as used in the db. The values should be zero.

my $last_line;
foreach my $line (<STDIN>) {
	#chomp($line);
	if ($line =~ m/\d+\s+(\d)\s+(\d{10})\d+\s+(\d+)/) {
		my $id = $1;
		my $timestamp = $2;
		my $value = $3;
		my $timediff = $timestamp - $last_timestamp;

		next if $value == 0;
#print STDERR "timediff: $timediff\n";

		if ($timediff < 60) {
			if ($timediff <= 0) {
				#print STDERR "# $last_line";
				#print STDERR "# $line";
			}
			$data{$id} += $value;
		} else {
			#print "# $line\n";
			#my $total = 0;
			print "rrdtool update smartmeter.rrd $last_timestamp";
			foreach (2..4) {
				if ($data{$_}) {
					#$total += $data{$_};
					#$data{$_} = $data{$_} * 30;
					print ":$data{$_}";
					$data{$_} = 0;
				} else {
					print ":0";
				}
			}
			print ":0\n";
			#$total = $total * 30;
			#print "rrdtool update smartmeter_lost_watt.rrd $last_timestamp:0\n";
			#print "rrdtool update smartmeter_total_watt.rrd $last_timestamp:$total\n";
			$data{$id} += $value;
			#$last_timestamp += 3600;
			$last_timestamp = $timestamp;
		}

		$last_line = $line;
	}
	#print STDERR "# --\n";
}

