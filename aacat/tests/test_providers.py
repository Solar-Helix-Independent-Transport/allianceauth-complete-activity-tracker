from unittest import mock

from django.test import TestCase

from aacat import providers


class TestAACatProvider(TestCase):
    def test_true_green_tick(self):
        self.assertTrue(True)
